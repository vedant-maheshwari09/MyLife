import { 
  type User, 
  type InsertUser,
  type Goal,
  type InsertGoal,
  type Activity,
  type InsertActivity,
  type Tab,
  type InsertTab,
  type Todo,
  type InsertTodo,
  type Note,
  type InsertNote,
  type ProgressEntry,
  type InsertProgressEntry,
  type ChatMemory,
  type InsertChatMemory,
  type TimeSession,
  type InsertTimeSession,
  type UserSettings,
  type InsertUserSettings,
  users,
  goals,
  activities,
  tabs,
  todos,
  notes,
  progressEntries,
  chatMemories,
  timeSessions,
  userSettings
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon database
neonConfig.webSocketConstructor = ws;
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  authenticateUser(email: string, password: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: string, newPassword: string): Promise<User | undefined>;
  setEmailVerificationCode(userId: string, code: string | null, expiry: Date | null): Promise<void>;
  verifyEmailCode(userId: string, code: string): Promise<boolean>;

  // Goals
  getUserGoals(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  // Activities
  getUserActivities(userId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<boolean>;

  // Tabs
  getUserTabs(userId: string): Promise<Tab[]>;
  createTab(tab: InsertTab): Promise<Tab>;
  updateTab(id: string, tab: Partial<InsertTab>): Promise<Tab | undefined>;
  deleteTab(id: string): Promise<boolean>;

  // Todos
  getUserTodos(userId: string): Promise<Todo[]>;
  getTodosByTab(userId: string, tabId: string | null): Promise<Todo[]>;
  getTodosByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Todo[]>;
  getTodosNeedingReminders(currentTime: Date): Promise<(Todo & { userEmail: string })[]>;
  createTodo(todo: InsertTodo): Promise<Todo>;
  updateTodo(id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined>;
  deleteTodo(id: string): Promise<boolean>;
  cleanupCompletedTodos(): Promise<number>; // Returns count of cleaned up todos

  // Notes
  getUserNotes(userId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Progress Entries
  getUserProgressEntries(userId: string): Promise<ProgressEntry[]>;
  getProgressEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<ProgressEntry[]>;
  createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry>;
  updateProgressEntry(id: string, entry: Partial<InsertProgressEntry>): Promise<ProgressEntry | undefined>;
  deleteProgressEntry(id: string): Promise<boolean>;

  // Chat Memories
  getUserChatMemories(userId: string): Promise<ChatMemory[]>;
  createChatMemory(memory: InsertChatMemory): Promise<ChatMemory>;
  deleteChatMemory(id: string): Promise<boolean>;

  // Time Sessions
  getUserTimeSessions(userId: string): Promise<TimeSession[]>;
  getTimeSessionsByActivity(userId: string, activityId: string): Promise<TimeSession[]>;
  getActiveTimeSession(userId: string): Promise<TimeSession | undefined>;
  createTimeSession(session: InsertTimeSession): Promise<TimeSession>;
  updateTimeSession(id: string, session: Partial<InsertTimeSession>): Promise<TimeSession | undefined>;
  deleteTimeSession(id: string): Promise<boolean>;
  stopActiveSession(userId: string, description?: string): Promise<TimeSession | undefined>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private goals: Map<string, Goal>;
  private activities: Map<string, Activity>;
  private tabs: Map<string, Tab>;
  private todos: Map<string, Todo>;
  private notes: Map<string, Note>;
  private progressEntries: Map<string, ProgressEntry>;
  private chatMemories: Map<string, ChatMemory>;
  private timeSessions: Map<string, TimeSession>;
  private userSettings: Map<string, UserSettings>;

  constructor() {
    this.users = new Map();
    this.goals = new Map();
    this.activities = new Map();
    this.tabs = new Map();
    this.todos = new Map();
    this.notes = new Map();
    this.progressEntries = new Map();
    this.chatMemories = new Map();
    this.timeSessions = new Map();
    this.userSettings = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      username: insertUser.email.split('@')[0], // Generate username from email
      isEmailVerified: false,
      emailVerificationCode: null,
      emailVerificationExpiry: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, password: newPassword };
    this.users.set(id, updated);
    return updated;
  }

  async setEmailVerificationCode(userId: string, code: string | null, expiry: Date | null): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.emailVerificationCode = code;
      user.emailVerificationExpiry = expiry;
      this.users.set(userId, user);
    }
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.emailVerificationCode || !user.emailVerificationExpiry) {
      return false;
    }

    if (user.emailVerificationCode === code && user.emailVerificationExpiry > new Date()) {
      user.isEmailVerified = true;
      user.emailVerificationCode = null;
      user.emailVerificationExpiry = null;
      this.users.set(userId, user);
      return true;
    }

    return false;
  }

  // Goals
  async getUserGoals(userId: string): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(goal => goal.userId === userId);
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const id = randomUUID();
    const newGoal: Goal = {
      ...goal,
      id,
      tabId: goal.tabId ?? null,
      progress: goal.progress ?? 0,
      maxProgress: goal.maxProgress ?? 100,
      isCompleted: goal.isCompleted ?? false,
      description: goal.description ?? null,
      targetDate: goal.targetDate ?? null,
      tags: goal.tags ?? [],
      createdAt: new Date()
    };
    this.goals.set(id, newGoal);
    return newGoal;
  }

  async updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const existing = this.goals.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...goal };
    this.goals.set(id, updated);
    return updated;
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.goals.delete(id);
  }

  // Activities
  async getUserActivities(userId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => activity.userId === userId);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const newActivity: Activity = {
      ...activity,
      id,
      description: activity.description ?? null,
      hoursPerWeek: activity.hoursPerWeek ?? null,
      minHours: activity.minHours ?? null,
      maxHours: activity.maxHours ?? null,
      createdAt: new Date()
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const existing = this.activities.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...activity };
    this.activities.set(id, updated);
    return updated;
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Tabs
  async getUserTabs(userId: string): Promise<Tab[]> {
    return Array.from(this.tabs.values()).filter(tab => tab.userId === userId);
  }

  async createTab(tab: InsertTab): Promise<Tab> {
    const id = randomUUID();
    const newTab: Tab = {
      ...tab,
      id,
      color: tab.color || "#3b82f6",
      isDefault: tab.isDefault || false,
      createdAt: new Date()
    };
    this.tabs.set(id, newTab);
    return newTab;
  }

  async updateTab(id: string, tab: Partial<InsertTab>): Promise<Tab | undefined> {
    const existing = this.tabs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...tab };
    this.tabs.set(id, updated);
    return updated;
  }

  async deleteTab(id: string): Promise<boolean> {
    return this.tabs.delete(id);
  }

  // Todos
  async getUserTodos(userId: string): Promise<Todo[]> {
    return Array.from(this.todos.values()).filter(todo => todo.userId === userId);
  }

  async getTodosByTab(userId: string, tabId: string | null): Promise<Todo[]> {
    if (tabId === null) {
      // Return all todos for "All Tasks" tab
      return Array.from(this.todos.values()).filter(todo => todo.userId === userId);
    }
    return Array.from(this.todos.values()).filter(todo => 
      todo.userId === userId && todo.tabId === tabId
    );
  }

  async getTodosByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Todo[]> {
    return Array.from(this.todos.values()).filter(todo => 
      todo.userId === userId && 
      todo.dueDate && 
      new Date(todo.dueDate) >= startDate && 
      new Date(todo.dueDate) <= endDate
    );
  }

  async getTodosNeedingReminders(currentTime: Date): Promise<(Todo & { userEmail: string })[]> {
    const currentMinute = new Date(currentTime);
    currentMinute.setSeconds(0, 0); // Reset seconds and milliseconds
    
    const result: (Todo & { userEmail: string })[] = [];
    
    for (const todo of Array.from(this.todos.values())) {
      // Skip completed todos or todos without reminders
      if (todo.isCompleted || !todo.hasReminder || !todo.reminderDate || !todo.reminderTime) {
        continue;
      }
      
      // Get user email
      const user = this.users.get(todo.userId);
      if (!user) continue;
      
      // Check if reminder time matches current minute
      const reminderDateTime = new Date(todo.reminderDate);
      const [hours, minutes] = todo.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);
      
      if (reminderDateTime.getTime() === currentMinute.getTime()) {
        result.push({
          ...todo,
          isRepeating: todo.isRepeating || false,
          repeatPattern: todo.repeatPattern || null,
          repeatInterval: todo.repeatInterval || 1,
          repeatDays: todo.repeatDays || null,
          tags: todo.tags || [],
          userEmail: user.email
        });
      }
    }
    
    return result;
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const id = randomUUID();
    const newTodo: Todo = {
      ...todo,
      id,
      tabId: todo.tabId ?? null,
      description: todo.description ?? null,
      dueDate: todo.dueDate ?? null,
      dueTime: todo.dueTime ?? null,
      priority: todo.priority ?? "medium",
      isCompleted: todo.isCompleted ?? false,
      hasReminder: todo.hasReminder ?? false,
      reminderDate: todo.reminderDate ?? null,
      reminderTime: todo.reminderTime ?? null,
      isRepeating: todo.isRepeating ?? false,
      repeatPattern: todo.repeatPattern ?? null,
      repeatInterval: todo.repeatInterval ?? 1,
      repeatDays: todo.repeatDays ?? null,
      tags: todo.tags ?? [],
      createdAt: new Date()
    };
    this.todos.set(id, newTodo);
    return newTodo;
  }

  async updateTodo(id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined> {
    const existing = this.todos.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...todo };
    this.todos.set(id, updated);
    return updated;
  }

  async deleteTodo(id: string): Promise<boolean> {
    return this.todos.delete(id);
  }

  async cleanupCompletedTodos(): Promise<number> {
    // Delete completed todos that were completed more than 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    let deletedCount = 0;
    for (const [id, todo] of this.todos) {
      if (todo.isCompleted && todo.createdAt <= twentyFourHoursAgo) {
        this.todos.delete(id);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Notes
  async getUserNotes(userId: string): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.userId === userId);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = randomUUID();
    const now = new Date();
    const newNote: Note = {
      ...note,
      id,
      tags: note.tags ?? [],
      createdAt: now,
      updatedAt: now
    };
    this.notes.set(id, newNote);
    return newNote;
  }

  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const existing = this.notes.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...note, 
      updatedAt: new Date() 
    };
    this.notes.set(id, updated);
    return updated;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Progress Entries
  async getUserProgressEntries(userId: string): Promise<ProgressEntry[]> {
    return Array.from(this.progressEntries.values()).filter(entry => entry.userId === userId);
  }

  async getProgressEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<ProgressEntry[]> {
    return Array.from(this.progressEntries.values()).filter(entry => 
      entry.userId === userId && 
      new Date(entry.entryDate) >= startDate && 
      new Date(entry.entryDate) <= endDate
    );
  }

  async createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry> {
    const id = randomUUID();
    const now = new Date();
    const newEntry: ProgressEntry = {
      ...entry,
      id,
      entryDate: now,
      createdAt: now
    };
    this.progressEntries.set(id, newEntry);
    return newEntry;
  }

  async updateProgressEntry(id: string, entry: Partial<InsertProgressEntry>): Promise<ProgressEntry | undefined> {
    const existing = this.progressEntries.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...entry };
    this.progressEntries.set(id, updated);
    return updated;
  }

  async deleteProgressEntry(id: string): Promise<boolean> {
    return this.progressEntries.delete(id);
  }

  // Chat Memories
  async getUserChatMemories(userId: string): Promise<ChatMemory[]> {
    return Array.from(this.chatMemories.values()).filter(memory => memory.userId === userId);
  }

  async createChatMemory(memory: InsertChatMemory): Promise<ChatMemory> {
    const id = randomUUID();
    const newMemory: ChatMemory = {
      ...memory,
      id,
      createdAt: new Date()
    };
    this.chatMemories.set(id, newMemory);
    return newMemory;
  }

  async deleteChatMemory(id: string): Promise<boolean> {
    return this.chatMemories.delete(id);
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const id = randomUUID();
    const now = new Date();
    const newSettings: UserSettings = {
      ...settings,
      id,
      darkMode: settings.darkMode ?? false,
      emailNotifications: settings.emailNotifications ?? true,
      progressNotificationTime: settings.progressNotificationTime ?? "18:00",
      createdAt: now,
      updatedAt: now
    };
    this.userSettings.set(id, newSettings);
    return newSettings;
  }

  async updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const existing = Array.from(this.userSettings.values()).find(s => s.userId === userId);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...settings, 
      updatedAt: new Date() 
    };
    this.userSettings.set(existing.id, updated);
    return updated;
  }

  // Time Sessions
  async getUserTimeSessions(userId: string): Promise<TimeSession[]> {
    return Array.from(this.timeSessions.values()).filter(session => session.userId === userId);
  }

  async getTimeSessionsByActivity(userId: string, activityId: string): Promise<TimeSession[]> {
    return Array.from(this.timeSessions.values()).filter(
      session => session.userId === userId && session.activityId === activityId
    );
  }

  async getActiveTimeSession(userId: string): Promise<TimeSession | undefined> {
    return Array.from(this.timeSessions.values()).find(
      session => session.userId === userId && session.isActive
    );
  }

  async createTimeSession(session: InsertTimeSession): Promise<TimeSession> {
    const id = randomUUID();
    const newSession: TimeSession = {
      ...session,
      id,
      createdAt: new Date()
    };
    this.timeSessions.set(id, newSession);
    return newSession;
  }

  async updateTimeSession(id: string, session: Partial<InsertTimeSession>): Promise<TimeSession | undefined> {
    const existing = this.timeSessions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...session };
    this.timeSessions.set(id, updated);
    return updated;
  }

  async deleteTimeSession(id: string): Promise<boolean> {
    return this.timeSessions.delete(id);
  }

  async stopActiveSession(userId: string, description?: string): Promise<TimeSession | undefined> {
    const activeSession = await this.getActiveTimeSession(userId);
    if (!activeSession) return undefined;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000);

    return await this.updateTimeSession(activeSession.id, {
      endTime,
      duration,
      description,
      isActive: false
    });
  }
}

// PostgreSQL Storage Implementation
export class PostgreSQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(
      and(eq(users.email, email), eq(users.password, password))
    ).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userWithUsername = {
      ...insertUser,
      username: insertUser.email.split('@')[0] // Generate username from email
    };
    const result = await this.db.insert(users).values(userWithUsername).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUserPassword(id: string, newPassword: string): Promise<User | undefined> {
    const result = await this.db.update(users).set({ password: newPassword }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async setEmailVerificationCode(userId: string, code: string | null, expiry: Date | null): Promise<void> {
    await this.db.update(users).set({
      emailVerificationCode: code,
      emailVerificationExpiry: expiry
    }).where(eq(users.id, userId));
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const result = await this.db.select().from(users).where(
      and(
        eq(users.id, userId),
        eq(users.emailVerificationCode, code)
      )
    ).limit(1);
    
    const user = result[0];
    if (!user || !user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      return false;
    }

    await this.db.update(users).set({
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null
    }).where(eq(users.id, userId));
    
    return true;
  }

  // Goals
  async getUserGoals(userId: string): Promise<Goal[]> {
    return await this.db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await this.db.insert(goals).values(goal).returning();
    return result[0];
  }

  async updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const result = await this.db.update(goals).set(goal).where(eq(goals.id, id)).returning();
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await this.db.delete(goals).where(eq(goals.id, id));
    return result.rowCount > 0;
  }

  // Activities
  async getUserActivities(userId: string): Promise<Activity[]> {
    return await this.db.select().from(activities).where(eq(activities.userId, userId));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await this.db.insert(activities).values(activity).returning();
    return result[0];
  }

  async updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const result = await this.db.update(activities).set(activity).where(eq(activities.id, id)).returning();
    return result[0];
  }

  async deleteActivity(id: string): Promise<boolean> {
    const result = await this.db.delete(activities).where(eq(activities.id, id));
    return result.rowCount > 0;
  }

  // Tabs
  async getUserTabs(userId: string): Promise<Tab[]> {
    return await this.db.select().from(tabs).where(eq(tabs.userId, userId));
  }

  async createTab(tab: InsertTab): Promise<Tab> {
    const result = await this.db.insert(tabs).values(tab).returning();
    return result[0];
  }

  async updateTab(id: string, tab: Partial<InsertTab>): Promise<Tab | undefined> {
    const result = await this.db.update(tabs).set(tab).where(eq(tabs.id, id)).returning();
    return result[0];
  }

  async deleteTab(id: string): Promise<boolean> {
    const result = await this.db.delete(tabs).where(eq(tabs.id, id));
    return result.rowCount > 0;
  }

  // Todos
  async getUserTodos(userId: string): Promise<Todo[]> {
    return await this.db.select().from(todos).where(eq(todos.userId, userId));
  }

  async getTodosByTab(userId: string, tabId: string | null): Promise<Todo[]> {
    if (tabId === null) {
      // Return all todos for "All Tasks" tab
      return await this.db.select().from(todos).where(eq(todos.userId, userId));
    }
    return await this.db.select().from(todos).where(
      and(eq(todos.userId, userId), eq(todos.tabId, tabId))
    );
  }

  async getTodosByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Todo[]> {
    return await this.db.select().from(todos).where(
      and(
        eq(todos.userId, userId),
        gte(todos.dueDate, startDate),
        lte(todos.dueDate, endDate)
      )
    );
  }

  async getTodosNeedingReminders(currentTime: Date): Promise<(Todo & { userEmail: string })[]> {
    const result = await this.db.select({
      id: todos.id,
      userId: todos.userId,
      title: todos.title,
      description: todos.description,
      dueDate: todos.dueDate,
      dueTime: todos.dueTime,
      priority: todos.priority,
      isCompleted: todos.isCompleted,
      hasReminder: todos.hasReminder,
      reminderDate: todos.reminderDate,
      reminderTime: todos.reminderTime,
      createdAt: todos.createdAt,
      userEmail: users.email
    })
    .from(todos)
    .innerJoin(users, eq(todos.userId, users.id))
    .where(and(
      eq(todos.isCompleted, false), // Only incomplete todos
      eq(todos.hasReminder, true),  // Only todos with reminders
      isNotNull(todos.reminderDate)
    ));
    
    // Filter by current time (within the current minute)
    const currentMinute = new Date(currentTime);
    currentMinute.setSeconds(0, 0); // Reset seconds and milliseconds
    
    return result.filter(todo => {
      if (!todo.reminderDate || !todo.reminderTime) return false;
      
      const reminderDateTime = new Date(todo.reminderDate);
      const [hours, minutes] = todo.reminderTime.split(':').map(Number);
      reminderDateTime.setHours(hours, minutes, 0, 0);
      
      // Check if reminder time matches current minute
      return reminderDateTime.getTime() === currentMinute.getTime();
    });
  }

  async createTodo(todo: InsertTodo): Promise<Todo> {
    const result = await this.db.insert(todos).values(todo).returning();
    return result[0];
  }

  async updateTodo(id: string, todo: Partial<InsertTodo>): Promise<Todo | undefined> {
    const result = await this.db.update(todos).set(todo).where(eq(todos.id, id)).returning();
    return result[0];
  }

  async deleteTodo(id: string): Promise<boolean> {
    const result = await this.db.delete(todos).where(eq(todos.id, id));
    return result.rowCount > 0;
  }

  async cleanupCompletedTodos(): Promise<number> {
    // Delete completed todos that were completed more than 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const result = await this.db.delete(todos).where(
      and(
        eq(todos.isCompleted, true),
        lte(todos.createdAt, twentyFourHoursAgo)
      )
    );
    
    return result.rowCount || 0;
  }

  // Notes
  async getUserNotes(userId: string): Promise<Note[]> {
    return await this.db.select().from(notes).where(eq(notes.userId, userId));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const result = await this.db.insert(notes).values(note).returning();
    return result[0];
  }

  async updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const result = await this.db.update(notes).set({...note, updatedAt: new Date()}).where(eq(notes.id, id)).returning();
    return result[0];
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await this.db.delete(notes).where(eq(notes.id, id));
    return result.rowCount > 0;
  }

  // Progress Entries
  async getUserProgressEntries(userId: string): Promise<ProgressEntry[]> {
    return await this.db.select().from(progressEntries).where(eq(progressEntries.userId, userId));
  }

  async getProgressEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<ProgressEntry[]> {
    return await this.db.select().from(progressEntries).where(
      and(
        eq(progressEntries.userId, userId),
        gte(progressEntries.entryDate, startDate),
        lte(progressEntries.entryDate, endDate)
      )
    );
  }

  async createProgressEntry(entry: InsertProgressEntry): Promise<ProgressEntry> {
    const result = await this.db.insert(progressEntries).values(entry).returning();
    return result[0];
  }

  async updateProgressEntry(id: string, entry: Partial<InsertProgressEntry>): Promise<ProgressEntry | undefined> {
    const result = await this.db
      .update(progressEntries)
      .set(entry)
      .where(eq(progressEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteProgressEntry(id: string): Promise<boolean> {
    const result = await this.db
      .delete(progressEntries)
      .where(eq(progressEntries.id, id));
    return result.rowCount > 0;
  }

  // Chat Memories
  async getUserChatMemories(userId: string): Promise<ChatMemory[]> {
    return await this.db.select().from(chatMemories).where(eq(chatMemories.userId, userId));
  }

  async createChatMemory(memory: InsertChatMemory): Promise<ChatMemory> {
    const result = await this.db.insert(chatMemories).values(memory).returning();
    return result[0];
  }

  async deleteChatMemory(id: string): Promise<boolean> {
    const result = await this.db.delete(chatMemories).where(eq(chatMemories.id, id));
    return result.rowCount > 0;
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const result = await this.db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    return result[0];
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const result = await this.db.insert(userSettings).values(settings).returning();
    return result[0];
  }

  async updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const result = await this.db.update(userSettings).set({...settings, updatedAt: new Date()}).where(eq(userSettings.userId, userId)).returning();
    return result[0];
  }

  // Time Sessions
  async getUserTimeSessions(userId: string): Promise<TimeSession[]> {
    return await this.db.select().from(timeSessions).where(eq(timeSessions.userId, userId));
  }

  async getTimeSessionsByActivity(userId: string, activityId: string): Promise<TimeSession[]> {
    return await this.db
      .select()
      .from(timeSessions)
      .where(and(eq(timeSessions.userId, userId), eq(timeSessions.activityId, activityId)));
  }

  async getActiveTimeSession(userId: string): Promise<TimeSession | undefined> {
    const result = await this.db
      .select()
      .from(timeSessions)
      .where(and(eq(timeSessions.userId, userId), eq(timeSessions.isActive, true)))
      .limit(1);
    return result[0];
  }

  async createTimeSession(session: InsertTimeSession): Promise<TimeSession> {
    const result = await this.db.insert(timeSessions).values(session).returning();
    return result[0];
  }

  async updateTimeSession(id: string, session: Partial<InsertTimeSession>): Promise<TimeSession | undefined> {
    const result = await this.db
      .update(timeSessions)
      .set(session)
      .where(eq(timeSessions.id, id))
      .returning();
    return result[0];
  }

  async deleteTimeSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(timeSessions)
      .where(eq(timeSessions.id, id));
    return result.rowCount > 0;
  }

  async stopActiveSession(userId: string, description?: string): Promise<TimeSession | undefined> {
    const activeSession = await this.getActiveTimeSession(userId);
    if (!activeSession) return undefined;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000);

    return await this.updateTimeSession(activeSession.id, {
      endTime,
      duration,
      description,
      isActive: false
    });
  }
}

// Use PostgreSQL storage in production, memory storage for testing
export const storage = process.env.NODE_ENV === 'test' ? new MemStorage() : new PostgreSQLStorage();
