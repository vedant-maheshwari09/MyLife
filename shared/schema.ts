import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  hasCompletedCalendarSetup: boolean("has_completed_calendar_setup").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tabId: varchar("tab_id").references(() => tabs.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date"),
  progress: integer("progress").default(0).notNull(),
  maxProgress: integer("max_progress").default(100).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  tags: text("tags").array().default(sql`'{}'`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  hoursPerWeek: integer("hours_per_week"),
  minHours: integer("min_hours"),
  maxHours: integer("max_hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tabs = pgTable("tabs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6").notNull(), // Default blue color
  type: text("type").default("todos").notNull(), // "todos", "notes", "goals"
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const todos = pgTable("todos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tabId: varchar("tab_id").references(() => tabs.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  dueTime: text("due_time"),
  priority: text("priority").default("medium").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  hasReminder: boolean("has_reminder").default(false).notNull(),
  reminderDate: timestamp("reminder_date"),
  reminderTime: text("reminder_time"),
  isRepeating: boolean("is_repeating").default(false).notNull(),
  repeatPattern: text("repeat_pattern"), // "daily", "weekly", "monthly", "yearly"
  repeatInterval: integer("repeat_interval").default(1), // repeat every X days/weeks/months
  repeatDays: text("repeat_days").array(), // for weekly: ["monday", "wednesday"]
  tags: text("tags").array().default(sql`'{}'`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tabId: varchar("tab_id").references(() => tabs.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isImportant: boolean("is_important").default(false).notNull(),
  tags: text("tags").array().default(sql`'{}'`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const progressEntries = pgTable("progress_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  activities: json("activities").default(sql`'[]'`).notNull(), // Array of {activity: string, hours: number, minutes: number}
  journalEntry: text("journal_entry"), // "Anything else" journaling section (10-300 words)
  sleepHours: integer("sleep_hours"), // Hours of sleep
  healthFeeling: text("health_feeling"), // Health feeling emoji
  mood: text("mood"), // Overall mood emoji
  productivitySatisfaction: text("productivity_satisfaction"), // Productivity satisfaction emoji
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMemories = pgTable("chat_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timeSessions = pgTable("time_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  activityId: varchar("activity_id").references(() => activities.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Duration in seconds
  description: text("description"), // Optional note about what was accomplished
  isActive: boolean("is_active").default(false).notNull(), // Whether timer is currently running
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  darkMode: boolean("dark_mode").default(false).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  notificationType: text("notification_type").default("local").notNull(), // "local", "email", "off"
  progressNotificationEnabled: boolean("progress_notification_enabled").default(true).notNull(),
  progressNotificationTime: text("progress_notification_time").default("18:00").notNull(),
  todoReminderEnabled: boolean("todo_reminder_enabled").default(true).notNull(),
  missedTodoNotificationEnabled: boolean("missed_todo_notification_enabled").default(true).notNull(),
  language: text("language").default("en").notNull(), // en, es, zh, hi, fr
  autoDetectLanguage: boolean("auto_detect_language").default(true).notNull(),
  calendarIntegrationEnabled: boolean("calendar_integration_enabled").default(false).notNull(),
  calendarProvider: text("calendar_provider"), // "google", "outlook", "apple", etc.
  calendarAccessToken: text("calendar_access_token"),
  calendarRefreshToken: text("calendar_refresh_token"),
  calendarId: text("calendar_id"), // ID of the specific calendar to sync to
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  username: true, // Auto-generated from email
  createdAt: true,
  isEmailVerified: true,
  emailVerificationCode: true,
  emailVerificationExpiry: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({
  id: true,
  createdAt: true,
  entryDate: true,
});

export const insertChatMemorySchema = createInsertSchema(chatMemories).omit({
  id: true,
  createdAt: true,
});

export const insertTabSchema = createInsertSchema(tabs).omit({
  id: true,
  createdAt: true,
});

export const insertTimeSessionSchema = createInsertSchema(timeSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertTab = z.infer<typeof insertTabSchema>;
export type Tab = typeof tabs.$inferSelect;

export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Todo = typeof todos.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type ProgressEntry = typeof progressEntries.$inferSelect;

export type InsertChatMemory = z.infer<typeof insertChatMemorySchema>;
export type ChatMemory = typeof chatMemories.$inferSelect;

export type InsertTimeSession = z.infer<typeof insertTimeSessionSchema>;
export type TimeSession = typeof timeSessions.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
