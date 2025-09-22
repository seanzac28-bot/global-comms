import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  preferredLanguage: varchar("preferred_language").notNull().default("en-GB"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat rooms for random user matching
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

// Chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatRoomId: varchar("chat_room_id").notNull().references(() => chatRooms.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  originalLanguage: varchar("original_language").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dictionary entries for each user
export const dictionaryEntries = pgTable("dictionary_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text").notNull(),
  sourceLanguage: varchar("source_language").notNull(),
  targetLanguage: varchar("target_language").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatRoomsAsUser1: many(chatRooms, { relationName: "user1" }),
  chatRoomsAsUser2: many(chatRooms, { relationName: "user2" }),
  messages: many(messages),
  dictionaryEntries: many(dictionaryEntries),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  user1: one(users, {
    fields: [chatRooms.user1Id],
    references: [users.id],
    relationName: "user1",
  }),
  user2: one(users, {
    fields: [chatRooms.user2Id],
    references: [users.id],
    relationName: "user2",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chatRoom: one(chatRooms, {
    fields: [messages.chatRoomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const dictionaryEntriesRelations = relations(dictionaryEntries, ({ one }) => ({
  user: one(users, {
    fields: [dictionaryEntries.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  preferredLanguage: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).pick({
  user1Id: true,
  user2Id: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatRoomId: true,
  senderId: true,
  content: true,
  originalLanguage: true,
});

export const insertDictionaryEntrySchema = createInsertSchema(dictionaryEntries).pick({
  userId: true,
  originalText: true,
  translatedText: true,
  sourceLanguage: true,
  targetLanguage: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertDictionaryEntry = z.infer<typeof insertDictionaryEntrySchema>;
export type DictionaryEntry = typeof dictionaryEntries.$inferSelect;
