import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * PostgreSQL schema for Seoul Guestbook Wall
 * Converted from MySQL to support Supabase deployment
 */

// Guestbook entries table (no user authentication in production)
export const guestbookEntries = pgTable("guestbook_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  role: varchar("role", { length: 500 }).notNull(),
  dream: text("dream").notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  likes: integer("likes").default(0).notNull(),
  isHidden: integer("isHidden").default(0).notNull(), // 0 = visible, 1 = hidden
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type GuestbookEntry = typeof guestbookEntries.$inferSelect;
export type InsertGuestbookEntry = typeof guestbookEntries.$inferInsert;
export type UpdateGuestbookEntry = Partial<Omit<GuestbookEntry, 'id' | 'createdAt'>>;
