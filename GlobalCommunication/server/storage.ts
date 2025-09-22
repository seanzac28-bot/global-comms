import {
  users,
  chatRooms,
  messages,
  dictionaryEntries,
  type User,
  type UpsertUser,
  type InsertChatRoom,
  type ChatRoom,
  type InsertMessage,
  type Message,
  type InsertDictionaryEntry,
  type DictionaryEntry,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, desc, ne } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Chat room operations
  createChatRoom(chatRoom: InsertChatRoom): Promise<ChatRoom>;
  findOrCreateChatRoom(userId: string): Promise<ChatRoom>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  endChatRoom(id: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(chatRoomId: string): Promise<Message[]>;
  
  // Dictionary operations
  createDictionaryEntry(entry: InsertDictionaryEntry): Promise<DictionaryEntry>;
  getDictionaryEntries(userId: string): Promise<DictionaryEntry[]>;
  deleteDictionaryEntry(id: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Chat room operations
  async createChatRoom(chatRoomData: InsertChatRoom): Promise<ChatRoom> {
    const [chatRoom] = await db
      .insert(chatRooms)
      .values(chatRoomData)
      .returning();
    return chatRoom;
  }

  async findOrCreateChatRoom(userId: string): Promise<ChatRoom> {
    // First, try to find an existing room waiting for a second user
    const [existingRoom] = await db
      .select()
      .from(chatRooms)
      .where(
        and(
          isNull(chatRooms.user2Id),
          eq(chatRooms.isActive, true),
          // Make sure the user doesn't join their own room
          ne(chatRooms.user1Id, userId)
        )
      )
      .limit(1);

    if (existingRoom) {
      // Join the existing room
      const [updatedRoom] = await db
        .update(chatRooms)
        .set({ user2Id: userId })
        .where(eq(chatRooms.id, existingRoom.id))
        .returning();
      return updatedRoom;
    } else {
      // Create a new room and wait for another user
      return this.createChatRoom({ user1Id: userId });
    }
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [chatRoom] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return chatRoom;
  }

  async endChatRoom(id: string): Promise<void> {
    await db
      .update(chatRooms)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(chatRooms.id, id));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getMessages(chatRoomId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt));
  }

  // Dictionary operations
  async createDictionaryEntry(entryData: InsertDictionaryEntry): Promise<DictionaryEntry> {
    const [entry] = await db
      .insert(dictionaryEntries)
      .values(entryData)
      .returning();
    return entry;
  }

  async getDictionaryEntries(userId: string): Promise<DictionaryEntry[]> {
    return db
      .select()
      .from(dictionaryEntries)
      .where(eq(dictionaryEntries.userId, userId))
      .orderBy(desc(dictionaryEntries.createdAt));
  }

  async deleteDictionaryEntry(id: string, userId: string): Promise<void> {
    await db
      .delete(dictionaryEntries)
      .where(
        and(
          eq(dictionaryEntries.id, id),
          eq(dictionaryEntries.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
