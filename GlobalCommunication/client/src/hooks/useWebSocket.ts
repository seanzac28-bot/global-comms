import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";

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

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<ChatMessage['otherUser'] | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'connected' | 'disconnected'>('disconnected');
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionStatus('connecting');
      setSocket(ws);
      
      // Join the chat
      ws.send(JSON.stringify({
        type: 'join',
        userId: user.id,
        preferredLanguage: user.preferredLanguage,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'user_joined':
            setChatRoomId(message.chatRoomId || null);
            setOtherUser(message.otherUser || null);
            setConnectionStatus('connected');
            setMessages(prev => [...prev, {
              type: 'user_joined',
              content: `Connected to ${message.otherUser?.name || 'Unknown User'}`,
              timestamp: new Date(),
            }]);
            break;
            
          case 'waiting':
            setConnectionStatus('waiting');
            break;
            
          case 'message':
            setMessages(prev => [...prev, {
              ...message,
              timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
            }]);
            break;
            
          case 'translation':
            // Handle translation response
            setMessages(prev => prev.map(msg => 
              msg.content === message.content ? {
                ...msg,
                translatedContent: message.translatedContent,
                targetLanguage: message.targetLanguage,
              } : msg
            ));
            break;
            
          case 'typing':
            setIsTyping(message.isTyping || false);
            if (message.isTyping) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
              }, 3000);
            }
            break;
            
          case 'user_left':
            setConnectionStatus('disconnected');
            setOtherUser(null);
            setChatRoomId(null);
            setMessages(prev => [...prev, {
              type: 'user_left',
              content: message.message || 'User left the chat',
              timestamp: new Date(),
            }]);
            break;
            
          case 'error':
            console.error('WebSocket error:', message.error);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setSocket(null);
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, connect]);

  const sendMessage = useCallback((content: string) => {
    if (socket && isConnected && chatRoomId && user) {
      socket.send(JSON.stringify({
        type: 'send_message',
        userId: user.id,
        content,
        chatRoomId,
      }));
    }
  }, [socket, isConnected, chatRoomId, user]);

  const translateMessage = useCallback((content: string, sourceLanguage: string, targetLanguage: string) => {
    if (socket && isConnected && user) {
      socket.send(JSON.stringify({
        type: 'translate_message',
        userId: user.id,
        content,
        sourceLanguage,
        targetLanguage,
      }));
    }
  }, [socket, isConnected, user]);

  const sendTyping = useCallback((typing: boolean) => {
    if (socket && isConnected && chatRoomId && user) {
      socket.send(JSON.stringify({
        type: 'typing',
        userId: user.id,
        chatRoomId,
        isTyping: typing,
      }));
    }
  }, [socket, isConnected, chatRoomId, user]);

  const leaveChat = useCallback(() => {
    if (socket && isConnected && chatRoomId && user) {
      socket.send(JSON.stringify({
        type: 'leave_chat',
        userId: user.id,
        chatRoomId,
      }));
    }
    setMessages([]);
    setChatRoomId(null);
    setOtherUser(null);
    setConnectionStatus('disconnected');
  }, [socket, isConnected, chatRoomId, user]);

  const startNewChat = useCallback(() => {
    leaveChat();
    setTimeout(() => {
      if (socket && user) {
        socket.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          preferredLanguage: user.preferredLanguage,
        }));
        setConnectionStatus('connecting');
      }
    }, 500);
  }, [socket, user, leaveChat]);

  return {
    isConnected,
    messages,
    chatRoomId,
    otherUser,
    isTyping,
    connectionStatus,
    sendMessage,
    translateMessage,
    sendTyping,
    leaveChat,
    startNewChat,
  };
}
