import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { translationService } from './translationService';
import type { Server } from 'http';

interface ChatUser {
  userId: string;
  socket: WebSocket;
  chatRoomId?: string;
  preferredLanguage: string;
}

interface ChatMessage {
  type: 'message' | 'user_joined' | 'user_left' | 'translation' | 'typing' | 'error' | 'waiting';
  chatRoomId?: string;
  senderId?: string;
  content?: string;
  translatedContent?: string;
  originalLanguage?: string;
  targetLanguage?: string;
  timestamp?: Date;
  error?: string;
  message?: string;
  isTyping?: boolean;
  otherUser?: {
    id: string;
    name: string;
    preferredLanguage: string;
  };
}

export class ChatService {
  private wss: WebSocketServer;
  private users: Map<string, ChatUser> = new Map();
  private waitingUsers: string[] = [];

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (socket: WebSocket, request) => {
      console.log('New WebSocket connection');

      socket.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(socket, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          this.sendError(socket, 'Invalid message format');
        }
      });

      socket.on('close', () => {
        this.handleDisconnection(socket);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(socket: WebSocket, message: any) {
    switch (message.type) {
      case 'join':
        await this.handleUserJoin(socket, message);
        break;
      case 'send_message':
        await this.handleSendMessage(socket, message);
        break;
      case 'translate_message':
        await this.handleTranslateMessage(socket, message);
        break;
      case 'typing':
        await this.handleTyping(socket, message);
        break;
      case 'leave_chat':
        await this.handleLeaveChat(socket, message);
        break;
      default:
        this.sendError(socket, 'Unknown message type');
    }
  }

  private async handleUserJoin(socket: WebSocket, message: any) {
    const { userId, preferredLanguage } = message;
    
    if (!userId) {
      this.sendError(socket, 'User ID is required');
      return;
    }

    // Get user from database
    const user = await storage.getUser(userId);
    if (!user) {
      this.sendError(socket, 'User not found');
      return;
    }

    // Store user connection
    const chatUser: ChatUser = {
      userId,
      socket,
      preferredLanguage: preferredLanguage || user.preferredLanguage,
    };
    this.users.set(userId, chatUser);

    // Try to match with another user
    await this.matchUsers(userId);
  }

  private async matchUsers(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    try {
      // Find or create a chat room
      const chatRoom = await storage.findOrCreateChatRoom(userId);
      user.chatRoomId = chatRoom.id;

      // If the room has both users, notify them
      if (chatRoom.user2Id) {
        const otherUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
        const otherUser = this.users.get(otherUserId);

        if (otherUser) {
          otherUser.chatRoomId = chatRoom.id;
          
          // Get user details for each other
          const userDetails = await storage.getUser(userId);
          const otherUserDetails = await storage.getUser(otherUserId);

          // Notify both users
          this.sendToUser(userId, {
            type: 'user_joined',
            chatRoomId: chatRoom.id,
            otherUser: {
              id: otherUserId,
              name: `${otherUserDetails?.firstName || ''} ${otherUserDetails?.lastName || ''}`.trim() || 'Anonymous',
              preferredLanguage: otherUser.preferredLanguage,
            },
          });

          this.sendToUser(otherUserId, {
            type: 'user_joined',
            chatRoomId: chatRoom.id,
            otherUser: {
              id: userId,
              name: `${userDetails?.firstName || ''} ${userDetails?.lastName || ''}`.trim() || 'Anonymous',
              preferredLanguage: user.preferredLanguage,
            },
          });
        }
      } else {
        // User is waiting for a match
        this.sendToUser(userId, {
          type: 'waiting',
          message: 'Waiting for another user to join...',
        });
      }
    } catch (error) {
      console.error('Error matching users:', error);
      this.sendError(user.socket, 'Failed to join chat');
    }
  }

  private async handleSendMessage(socket: WebSocket, message: any) {
    const { userId, content, chatRoomId } = message;
    
    const user = this.users.get(userId);
    if (!user || user.chatRoomId !== chatRoomId) {
      this.sendError(socket, 'Invalid chat room');
      return;
    }

    try {
      // Save message to database
      const savedMessage = await storage.createMessage({
        chatRoomId,
        senderId: userId,
        content,
        originalLanguage: user.preferredLanguage,
      });

      // Get chat room to find other user
      const chatRoom = await storage.getChatRoom(chatRoomId);
      if (!chatRoom) {
        this.sendError(socket, 'Chat room not found');
        return;
      }

      const otherUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
      
      // Send message to both users
      const messageToSend: ChatMessage = {
        type: 'message',
        chatRoomId,
        senderId: userId,
        content,
        originalLanguage: user.preferredLanguage,
        timestamp: savedMessage.createdAt!,
      };

      this.sendToUser(userId, messageToSend);
      if (otherUserId) {
        this.sendToUser(otherUserId, messageToSend);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.sendError(socket, 'Failed to send message');
    }
  }

  private async handleTranslateMessage(socket: WebSocket, message: any) {
    const { userId, content, sourceLanguage, targetLanguage } = message;
    
    try {
      const translation = await translationService.translateText(
        content,
        sourceLanguage,
        targetLanguage
      );

      this.sendToUser(userId, {
        type: 'translation',
        translatedContent: translation.translatedText,
        originalLanguage: sourceLanguage,
        targetLanguage,
      });
    } catch (error) {
      console.error('Error translating message:', error);
      this.sendError(socket, 'Failed to translate message');
    }
  }

  private async handleTyping(socket: WebSocket, message: any) {
    const { userId, chatRoomId, isTyping } = message;
    
    const user = this.users.get(userId);
    if (!user || user.chatRoomId !== chatRoomId) return;

    // Get other user in the chat
    const chatRoom = await storage.getChatRoom(chatRoomId);
    if (!chatRoom) return;

    const otherUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
    if (otherUserId) {
      this.sendToUser(otherUserId, {
        type: 'typing',
        senderId: userId,
        isTyping,
      });
    }
  }

  private async handleLeaveChat(socket: WebSocket, message: any) {
    const { userId, chatRoomId } = message;
    
    try {
      // End the chat room
      await storage.endChatRoom(chatRoomId);
      
      // Get other user and notify them
      const chatRoom = await storage.getChatRoom(chatRoomId);
      if (chatRoom) {
        const otherUserId = chatRoom.user1Id === userId ? chatRoom.user2Id : chatRoom.user1Id;
        if (otherUserId) {
          this.sendToUser(otherUserId, {
            type: 'user_left',
            message: 'The other user has left the chat',
          });
        }
      }

      // Remove user from chat
      const user = this.users.get(userId);
      if (user) {
        user.chatRoomId = undefined;
      }
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  }

  private handleDisconnection(socket: WebSocket) {
    // Find and remove the user
    this.users.forEach((user, userId) => {
      if (user.socket === socket) {
        if (user.chatRoomId) {
          this.handleLeaveChat(socket, { userId, chatRoomId: user.chatRoomId });
        }
        this.users.delete(userId);
      }
    });
  }

  private sendToUser(userId: string, message: ChatMessage) {
    const user = this.users.get(userId);
    if (user && user.socket.readyState === WebSocket.OPEN) {
      user.socket.send(JSON.stringify(message));
    }
  }

  private sendError(socket: WebSocket, error: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'error',
        error,
      }));
    }
  }
}
