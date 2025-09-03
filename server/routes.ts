import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatWithAI, parseMemoryCommand, generateJournalingPrompts, intelligentTodoPrioritization } from "./services/gemini";
import { processVoiceCommand } from "./gemini";
import { generateVerificationCode, getCodeExpiryTime, sendVerificationEmail, sendPasswordResetEmail } from "./email-service";
import { calendarService } from "./calendar-service";
import { repetitionService } from "./repetition-service";
import { calculateComprehensiveStats, generateProductivityInsights } from "./analytics";
import { format } from "date-fns";
import { 
  insertGoalSchema,
  insertActivitySchema,
  insertTabSchema,
  insertTodoSchema,
  insertNoteSchema,
  insertProgressEntrySchema,
  insertChatMemorySchema,
  insertTimeSessionSchema,
  insertUserSettingsSchema,
  insertUserSchema
} from "@shared/schema";

// Helper function to get authenticated user from session
async function getAuthenticatedUser(req: any): Promise<any> {
  console.log("Session check:", { session: req.session, userId: req.session?.userId });
  if (!req.session?.userId) {
    throw new Error("Not authenticated");
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    throw new Error("Session user not found");
  }
  return user;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("Registration request body:", req.body);
      const userData = insertUserSchema.parse(req.body);
      console.log("Parsed user data:", userData);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const user = await storage.createUser(userData);

      // Generate and send verification code
      const verificationCode = generateVerificationCode();
      const expiry = getCodeExpiryTime();
      
      await storage.setEmailVerificationCode(user.id, verificationCode, expiry);
      await sendVerificationEmail(user.email, verificationCode);
      
      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        requiresVerification: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Check email availability endpoint
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      
      res.json({ 
        available: !existingUser,
        exists: !!existingUser
      });
    } catch (error) {
      console.error("Email check error:", error);
      res.status(500).json({ error: "Failed to check email availability" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt:", { email, password });
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.authenticateUser(email, password);
      console.log("User found:", user);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: "Email not verified", 
          requiresVerification: true,
          userId: user.id 
        });
      }

      // Store user in session
      (req as any).session.userId = user.id;
      console.log("Session set for user:", user.id);

      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        username: user.username 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Development login helper
  app.post("/api/auth/dev-login", async (req, res) => {
    try {
      // Create or get test user for development
      let user = await storage.getUserByEmail("test@example.com");
      if (!user) {
        user = await storage.createUser({
          name: "Test User",
          email: "test@example.com", 
          password: "test123"
        });
        // Skip email verification for dev user
        await storage.setEmailVerificationCode(user.id, null, null);
        user.isEmailVerified = true;
        await storage.updateUser(user.id, { isEmailVerified: true });
      }
      
      // Create session
      (req as any).session.userId = user.id;
      
      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        username: user.username 
      });
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });

  // Simple auto-login for testing
  app.get("/api/auth/auto-login", async (req, res) => {
    try {
      // Get or create test user
      let user = await storage.getUserByEmail("test@example.com");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Store user in session
      (req as any).session.userId = user.id;

      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        username: user.username 
      });
    } catch (error) {
      console.error("Dev login error:", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    try {
      // Destroy the session
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ error: "User ID and verification code are required" });
      }

      const verified = await storage.verifyEmailCode(userId, code);
      
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        username: user.username 
      });
    } catch (error) {
      res.status(500).json({ error: "Email verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Generate and send new verification code
      const verificationCode = generateVerificationCode();
      const expiry = getCodeExpiryTime();
      
      await storage.setEmailVerificationCode(user.id, verificationCode, expiry);
      await sendVerificationEmail(user.email, verificationCode);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to resend verification code" });
    }
  });

  // Password reset endpoints
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return res.json({ success: true });
      }

      // Generate and send password reset code
      const resetCode = generateVerificationCode();
      const expiry = getCodeExpiryTime();
      
      await storage.setEmailVerificationCode(user.id, resetCode, expiry);
      await sendPasswordResetEmail(user.email, resetCode);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to send password reset code" });
    }
  });

  app.post("/api/auth/verify-password-reset", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code, and new password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: "Invalid reset request" });
      }

      const verified = await storage.verifyEmailCode(user.id, code);
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      // Update password
      await storage.updateUserPassword(user.id, newPassword);
      
      // Clear verification code
      await storage.setEmailVerificationCode(user.id, null, null);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Password reset verification error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new passwords are required" });
      }

      // Verify current password
      const authenticated = await storage.authenticateUser(user.email, currentPassword);
      if (!authenticated) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Update password
      await storage.updateUserPassword(user.id, newPassword);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Google Calendar OAuth for first-time setup
  app.post("/api/auth/google-calendar-oauth", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      // Check if already has valid Google tokens
      const hasValidToken = await calendarService.ensureValidGoogleToken(user.id);
      
      if (hasValidToken) {
        // Already connected
        res.json({ connected: true });
      } else {
        // Generate OAuth URL
        const authUrl = calendarService.getGoogleAuthUrl(user.id, req);
        res.json({ authUrl });
      }
    } catch (error) {
      console.error("Calendar OAuth error:", error);
      res.status(500).json({ error: "Failed to initiate calendar connection" });
    }
  });

  // Mark calendar setup as completed
  app.post("/api/user/complete-calendar-setup", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      await storage.updateUser(user.id, { hasCompletedCalendarSetup: true });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Complete calendar setup error:", error);
      res.status(500).json({ error: "Failed to mark calendar setup as complete" });
    }
  });

  // Current user endpoint
  app.get("/api/user", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        hasCompletedCalendarSetup: user.hasCompletedCalendarSetup
      });
    } catch (error) {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Goals endpoints
  app.get("/api/goals", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const goals = await storage.getUserGoals(user.id);
      res.json(goals);
    } catch (error) {
      console.error("Goals fetch error:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      // Handle date conversion for targetDate
      const requestData = { ...req.body, userId: user.id };
      if (requestData.targetDate && typeof requestData.targetDate === 'string') {
        requestData.targetDate = new Date(requestData.targetDate);
      }
      
      const goalData = insertGoalSchema.parse(requestData);
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Goal creation error:", error);
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: "Not authenticated" });
      }
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const goal = await storage.updateGoal(id, updates);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGoal(id);
      if (!deleted) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // Activities endpoints
  app.get("/api/activities", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const activities = await storage.getUserActivities(user.id);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const activityData = insertActivitySchema.parse({ ...req.body, userId: user.id });
      const activity = await storage.createActivity(activityData);
      res.json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  app.patch("/api/activities/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const activity = await storage.updateActivity(id, updates);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(400).json({ error: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteActivity(id);
      if (!deleted) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  // Tabs endpoints
  app.get("/api/tabs", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const tabs = await storage.getUserTabs(user.id);
      res.json(tabs);
    } catch (error) {
      console.error("Tabs fetch error:", error);
      res.status(500).json({ error: "Failed to fetch tabs" });
    }
  });

  app.post("/api/tabs", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const tabData = insertTabSchema.parse({ ...req.body, userId: user.id });
      const tab = await storage.createTab(tabData);
      res.json(tab);
    } catch (error) {
      console.error("Tab creation error:", error);
      res.status(400).json({ error: "Invalid tab data" });
    }
  });

  app.delete("/api/tabs/:id", async (req, res) => {
    try {
      const success = await storage.deleteTab(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Tab not found" });
      }
    } catch (error) {
      console.error("Tab deletion error:", error);
      res.status(500).json({ error: "Failed to delete tab" });
    }
  });

  // Todos endpoints
  app.get("/api/todos", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      let todos;
      if (startDate && endDate) {
        todos = await storage.getTodosByDateRange(
          user.id, 
          new Date(startDate as string), 
          new Date(endDate as string)
        );
      } else {
        todos = await storage.getUserTodos(user.id);
      }
      
      res.json(todos);
    } catch (error) {
      console.error("Todos fetch error:", error);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/todos", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      // Convert date strings to Date objects before validation
      const body = { ...req.body, userId: user.id };
      if (body.dueDate && typeof body.dueDate === 'string') {
        body.dueDate = new Date(body.dueDate);
      }
      if (body.reminderDate && typeof body.reminderDate === 'string') {
        body.reminderDate = new Date(body.reminderDate);
      }
      
      const todoData = insertTodoSchema.parse(body);
      const todo = await storage.createTodo(todoData);
      
      // Automatically sync to calendar if integration is enabled and todo has due date
      if (todo.dueDate) {
        calendarService.syncTodoToCalendar(user.id, todo).then(success => {
          if (success) {
            console.log(`📅 Todo "${todo.title}" automatically synced to Google Calendar`);
          } else {
            console.log(`📅 Todo "${todo.title}" could not be synced to calendar (not connected or no due date)`);
          }
        }).catch(err => {
          console.log("Calendar sync error (non-fatal):", err);
        });
      }
      
      res.json(todo);
    } catch (error) {
      console.error("Todo creation error:", error);
      res.status(400).json({ error: "Invalid todo data" });
    }
  });

  app.patch("/api/todos/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { id } = req.params;
      const updates = req.body;
      
      // Get the original todo before updating
      const originalTodo = await storage.getUserTodos(user.id).then(todos => 
        todos.find(t => t.id === id)
      );
      
      const todo = await storage.updateTodo(id, updates);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }
      
      // Check if todo was just completed and is repeating
      if (originalTodo && !originalTodo.isCompleted && todo.isCompleted && repetitionService.shouldGenerateNext(todo)) {
        // Generate next occurrence asynchronously (don't block the response)
        repetitionService.generateNextOccurrence(todo).catch(err => {
          console.error("Error generating next todo occurrence:", err);
        });
      }
      
      res.json(todo);
    } catch (error) {
      res.status(400).json({ error: "Failed to update todo" });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTodo(id);
      if (!deleted) {
        return res.status(404).json({ error: "Todo not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });

  // Notes endpoints
  app.get("/api/notes", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const notes = await storage.getUserNotes(user.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      // Convert date strings to Date objects before validation
      const body = { ...req.body, userId: user.id };
      if (body.dueDate && typeof body.dueDate === 'string') {
        body.dueDate = new Date(body.dueDate);
      }
      
      const noteData = insertNoteSchema.parse(body);
      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      console.error("Note creation error:", error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const note = await storage.updateNote(id, updates);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(400).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNote(id);
      if (!deleted) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Todo prioritization endpoint
  app.get("/api/todos/prioritized", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const todos = await storage.getUserTodos(user.id);
      const goals = await storage.getUserGoals(user.id);
      const progress = await storage.getUserProgressEntries(user.id);
      
      const context = { userId: user.id, goals, progress, todos };
      const prioritizedTodos = await intelligentTodoPrioritization(todos, context);
      
      res.json(prioritizedTodos);
    } catch (error) {
      console.error('Error getting prioritized todos:', error);
      res.status(500).json({ error: 'Failed to get prioritized todos' });
    }
  });

  // Progress entries endpoints
  app.get("/api/progress", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { startDate, endDate } = req.query;
      
      let entries;
      if (startDate && endDate) {
        entries = await storage.getProgressEntriesByDateRange(
          user.id, 
          new Date(startDate as string), 
          new Date(endDate as string)
        );
      } else {
        entries = await storage.getUserProgressEntries(user.id);
      }
      
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress entries" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      // Validate required fields
      const requestData = { ...req.body, userId: user.id };
      
      // Validate activities array structure
      if (!requestData.activities || !Array.isArray(requestData.activities) || requestData.activities.length === 0) {
        return res.status(400).json({ error: "At least one activity is required" });
      }
      
      // Validate each activity has required fields
      for (const activity of requestData.activities) {
        if (!activity.activity || typeof activity.activity !== 'string') {
          return res.status(400).json({ error: "Each activity must have a name" });
        }
        if (typeof activity.hours !== 'number' || typeof activity.minutes !== 'number') {
          return res.status(400).json({ error: "Each activity must have valid hours and minutes" });
        }
      }
      
      const entryData = insertProgressEntrySchema.parse(requestData);
      
      // Check journal word count if provided
      if (entryData.journalEntry) {
        const wordCount = entryData.journalEntry.trim().split(/\s+/).length;
        if (wordCount < 10) {
          return res.status(400).json({ error: "Journal entry must be at least 10 words" });
        }
        if (wordCount > 300) {
          return res.status(400).json({ error: "Journal entry must be no more than 300 words" });
        }
      }
      
      // Check if user already has an entry for today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const existingEntries = await storage.getProgressEntriesByDateRange(
        user.id, 
        startOfDay, 
        endOfDay
      );
      
      if (existingEntries.length > 0) {
        return res.status(400).json({ error: "You can only create one progress entry per day" });
      }
      
      const entry = await storage.createProgressEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Progress creation error:", error);
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: "Not authenticated" });
      }
      res.status(400).json({ error: "Invalid progress entry data" });
    }
  });

  app.patch("/api/progress/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertProgressEntrySchema.partial().parse(req.body);
      
      // Check journal word count if being updated
      if (updateData.journalEntry) {
        const wordCount = updateData.journalEntry.trim().split(/\s+/).length;
        if (wordCount < 10) {
          return res.status(400).json({ error: "Journal entry must be at least 10 words" });
        }
        if (wordCount > 300) {
          return res.status(400).json({ error: "Journal entry must be no more than 300 words" });
        }
      }
      
      const entry = await storage.updateProgressEntry(id, updateData);
      
      if (!entry) {
        return res.status(404).json({ error: "Progress entry not found" });
      }
      
      res.json(entry);
    } catch (error) {
      res.status(400).json({ error: "Invalid progress entry data" });
    }
  });

  app.delete("/api/progress/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProgressEntry(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Progress entry not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete progress entry" });
    }
  });

  // Voice processing endpoint
  app.post("/api/voice/process", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { transcript } = req.body;
      
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: "Transcript is required" });
      }
      
      const result = await processVoiceCommand(transcript);
      res.json(result);
    } catch (error) {
      console.error("Voice processing error:", error);
      res.status(500).json({ error: "Failed to process voice command" });
    }
  });

  // Chat endpoints
  app.post("/api/chat", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check for memory commands
      const memoryCommand = parseMemoryCommand(message);
      if (memoryCommand) {
        const memory = await storage.createChatMemory({
          userId: user.id,
          content: memoryCommand.content
        });
        return res.json({ 
          response: "I've saved that to memory.",
          memory: memory 
        });
      }

      // Get user context for AI
      const [goals, activities, todos, notes, progress, memories] = await Promise.all([
        storage.getUserGoals(user.id),
        storage.getUserActivities(user.id),
        storage.getUserTodos(user.id),
        storage.getUserNotes(user.id),
        storage.getUserProgressEntries(user.id),
        storage.getUserChatMemories(user.id)
      ]);

      const context = {
        goals,
        activities,
        todos: todos.filter(t => !t.isCompleted),
        notes,
        progress,
        memories
      };

      const aiResponse = await chatWithAI(message, context);
      
      // Handle automatic task creation if AI detected a command
      if (aiResponse.action) {
        const action = aiResponse.action;
        
        try {
          if (action.type === 'task') {
            // Create a new todo
            const newTodo = await storage.createTodo({
              userId: user.id,
              title: action.title,
              description: action.description || '',
              dueDate: action.dueDate ? new Date(action.dueDate) : null,
              priority: action.priority || 'medium',
              isCompleted: false
            });
            
            return res.json({ 
              response: aiResponse.response + ` ✅ Task "${action.title}" has been added to your todos!`,
              createdTask: newTodo
            });
          } else if (action.type === 'goal') {
            // Create a new goal
            const newGoal = await storage.createGoal({
              userId: user.id,
              title: action.title,
              description: action.description || '',
              targetDate: action.dueDate ? new Date(action.dueDate) : null,
              isCompleted: false
            });
            
            return res.json({ 
              response: aiResponse.response + ` 🎯 Goal "${action.title}" has been created!`,
              createdGoal: newGoal
            });
          } else if (action.type === 'activity') {
            // Create a new activity
            const newActivity = await storage.createActivity({
              userId: user.id,
              title: action.title,
              description: action.description || '',
              hoursPerWeek: 2 // Default 2 hours per week
            });
            
            return res.json({ 
              response: aiResponse.response + ` 📋 Activity "${action.title}" has been added!`,
              createdActivity: newActivity
            });
          }
        } catch (actionError) {
          console.error('Failed to create item from AI action:', actionError);
          // Still return the AI response even if action fails
        }
      }
      
      res.json({ response: aiResponse.response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/memory", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const memories = await storage.getUserChatMemories(user.id);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat memories" });
    }
  });

  app.post("/api/chat/memory", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { content } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Content is required" });
      }

      const memory = await storage.createChatMemory({
        userId: user.id,
        content: content.trim()
      });
      
      res.json(memory);
    } catch (error) {
      res.status(400).json({ error: "Failed to save memory" });
    }
  });

  app.delete("/api/chat/memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteChatMemory(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Memory not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  app.get("/api/journaling-prompts", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      // Get user context for personalized prompts
      const [goals, activities, todos, notes, progress, memories] = await Promise.all([
        storage.getUserGoals(user.id),
        storage.getUserActivities(user.id),
        storage.getUserTodos(user.id),
        storage.getUserNotes(user.id),
        storage.getUserProgressEntries(user.id),
        storage.getUserChatMemories(user.id)
      ]);

      const context = {
        goals,
        activities,
        todos: todos.filter(t => !t.isCompleted),
        notes,
        progress: progress.slice(-7), // Last week of progress
        memories
      };

      const prompts = await generateJournalingPrompts(context);
      res.json({ prompts });
    } catch (error) {
      console.error("Journaling prompts error:", error);
      // Return default prompts if AI fails
      res.json({ 
        prompts: [
          "What was the highlight of your day?",
          "What challenged you today and how did you handle it?",
          "What are you most grateful for right now?",
          "What did you learn about yourself today?"
        ]
      });
    }
  });

  // User settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      let settings = await storage.getUserSettings(user.id);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createUserSettings({
          userId: user.id,
          darkMode: false,
          emailNotifications: true,
          progressNotificationTime: "18:00",
          language: "en",
          autoDetectLanguage: true
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const updates = req.body;
      let settings = await storage.updateUserSettings(user.id, updates);
      
      if (!settings) {
        // Create settings if they don't exist
        settings = await storage.createUserSettings({
          userId: user.id,
          ...updates
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: "Failed to update settings" });
    }
  });

  // Calendar Integration Routes
  app.get("/api/calendar/providers", async (req, res) => {
    try {
      const providers = calendarService.getAvailableProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar providers" });
    }
  });

  app.post("/api/calendar/enable", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { provider, accessToken, calendarId } = req.body;
      
      if (!provider || !accessToken) {
        return res.status(400).json({ error: "Provider and access token are required" });
      }
      
      const success = await calendarService.enableCalendarIntegration(
        user.id, 
        provider, 
        accessToken, 
        calendarId
      );
      
      if (success) {
        // Sync existing todos to calendar
        const syncedCount = await calendarService.syncAllUserTodos(user.id);
        res.json({ 
          success: true, 
          message: `Calendar integration enabled. ${syncedCount} todos synced.` 
        });
      } else {
        res.status(500).json({ error: "Failed to enable calendar integration" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to enable calendar integration" });
    }
  });

  app.post("/api/calendar/disable", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const success = await calendarService.disableCalendarIntegration(user.id);
      
      if (success) {
        res.json({ success: true, message: "Calendar integration disabled" });
      } else {
        res.status(500).json({ error: "Failed to disable calendar integration" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to disable calendar integration" });
    }
  });

  app.post("/api/calendar/sync", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const syncedCount = await calendarService.syncAllUserTodos(user.id);
      res.json({ 
        success: true, 
        message: `${syncedCount} todos synced to calendar` 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync todos to calendar" });
    }
  });

  // Time tracking endpoints
  app.get("/api/time-sessions", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const sessions = await storage.getUserTimeSessions(user.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time sessions" });
    }
  });

  app.get("/api/time-sessions/active", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const activeSession = await storage.getActiveTimeSession(user.id);
      res.json(activeSession || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active session" });
    }
  });

  app.post("/api/time-sessions/start", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { activityId } = req.body;

      if (!activityId) {
        return res.status(400).json({ error: "Activity ID is required" });
      }

      // Stop any existing active session
      await storage.stopActiveSession(user.id);

      // Start new session
      const sessionData = insertTimeSessionSchema.parse({
        userId: user.id,
        activityId,
        startTime: new Date(),
        isActive: true
      });

      const session = await storage.createTimeSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Start session error:", error);
      res.status(400).json({ error: "Failed to start time session" });
    }
  });

  app.post("/api/time-sessions/stop", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { description } = req.body;

      const stoppedSession = await storage.stopActiveSession(user.id, description);
      if (!stoppedSession) {
        return res.status(404).json({ error: "No active session found" });
      }

      res.json(stoppedSession);
    } catch (error) {
      res.status(400).json({ error: "Failed to stop time session" });
    }
  });

  app.get("/api/activities/:id/time-sessions", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { id } = req.params;
      const sessions = await storage.getTimeSessionsByActivity(user.id, id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity time sessions" });
    }
  });

  // Data Export/Import endpoints
  app.get("/api/export", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      
      // Gather all user data
      const [goals, activities, todos, notes, progressEntries, timeSessions, settings] = await Promise.all([
        storage.getUserGoals(user.id),
        storage.getUserActivities(user.id),
        storage.getUserTodos(user.id),
        storage.getUserNotes(user.id),
        storage.getUserProgressEntries(user.id),
        storage.getUserTimeSessions(user.id),
        storage.getUserSettings(user.id)
      ]);

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        data: {
          goals,
          activities,
          todos,
          notes,
          progressEntries,
          timeSessions,
          settings
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="mylife-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/import", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { data, options } = req.body;

      if (!data || !data.data) {
        return res.status(400).json({ error: "Invalid import data format" });
      }

      const importData = data.data;
      const results = {
        imported: 0,
        skipped: 0,
        errors: []
      };

      // Import goals
      if (importData.goals && options?.includeGoals) {
        for (const goal of importData.goals) {
          try {
            const { id, userId, createdAt, updatedAt, ...goalData } = goal;
            await storage.createGoal({ ...goalData, userId: user.id });
            results.imported++;
          } catch (error) {
            results.errors.push(`Goal: ${goal.title || 'Unknown'}`);
            results.skipped++;
          }
        }
      }

      // Import activities
      if (importData.activities && options?.includeActivities) {
        for (const activity of importData.activities) {
          try {
            const { id, userId, createdAt, updatedAt, ...activityData } = activity;
            await storage.createActivity({ ...activityData, userId: user.id });
            results.imported++;
          } catch (error) {
            results.errors.push(`Activity: ${activity.title || 'Unknown'}`);
            results.skipped++;
          }
        }
      }

      // Import todos
      if (importData.todos && options?.includeTodos) {
        for (const todo of importData.todos) {
          try {
            const { id, userId, createdAt, updatedAt, ...todoData } = todo;
            await storage.createTodo({ ...todoData, userId: user.id });
            results.imported++;
          } catch (error) {
            results.errors.push(`Todo: ${todo.text || 'Unknown'}`);
            results.skipped++;
          }
        }
      }

      // Import notes
      if (importData.notes && options?.includeNotes) {
        for (const note of importData.notes) {
          try {
            const { id, userId, createdAt, updatedAt, ...noteData } = note;
            await storage.createNote({ ...noteData, userId: user.id });
            results.imported++;
          } catch (error) {
            results.errors.push(`Note: ${note.title || 'Unknown'}`);
            results.skipped++;
          }
        }
      }

      res.json({
        success: true,
        message: `Import completed: ${results.imported} items imported, ${results.skipped} skipped`,
        details: results
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import data" });
    }
  });

  // Analytics and Statistics endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { period = 'week', includeInsights = 'true' } = req.query;
      
      // Get all user data for comprehensive analysis
      const [goals, activities, todos, notes, progressEntries, timeSessions] = await Promise.all([
        storage.getUserGoals(user.id),
        storage.getUserActivities(user.id),
        storage.getUserTodos(user.id),
        storage.getUserNotes(user.id),
        storage.getUserProgressEntries(user.id),
        storage.getUserTimeSessions(user.id)
      ]);
      
      const now = new Date();
      const stats = calculateComprehensiveStats({
        goals,
        activities,
        todos,
        notes,
        progressEntries,
        timeSessions,
        period: period as string,
        currentDate: now
      });
      
      if (includeInsights === 'true') {
        stats.insights = generateProductivityInsights({
          goals,
          activities,
          todos,
          progressEntries,
          timeSessions,
          currentDate: now
        });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });
  // Global search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { q: query } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({ results: [] });
      }

      const searchTerm = query.toLowerCase();
      const results = [];

      // Search goals
      const goals = await storage.getUserGoals(user.id);
      goals.forEach(goal => {
        if (goal.title.toLowerCase().includes(searchTerm) || 
            goal.description?.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'goal',
            id: goal.id,
            title: goal.title,
            content: goal.description || '',
            tabId: goal.tabId,
            relevance: goal.title.toLowerCase().includes(searchTerm) ? 'high' : 'medium'
          });
        }
      });

      // Search activities
      const activities = await storage.getUserActivities(user.id);
      activities.forEach(activity => {
        if (activity.title.toLowerCase().includes(searchTerm) || 
            activity.description?.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'activity',
            id: activity.id,
            title: activity.title,
            content: activity.description || '',
            relevance: activity.title.toLowerCase().includes(searchTerm) ? 'high' : 'medium'
          });
        }
      });

      // Search todos
      const todos = await storage.getUserTodos(user.id);
      todos.forEach(todo => {
        if (todo.title.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'todo',
            id: todo.id,
            title: todo.title,
            content: '',
            tabId: todo.tabId,
            isCompleted: todo.isCompleted,
            relevance: 'high'
          });
        }
      });

      // Search notes
      const notes = await storage.getUserNotes(user.id);
      notes.forEach(note => {
        if (note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'note',
            id: note.id,
            title: note.title,
            content: note.content,
            tabId: note.tabId,
            relevance: note.title.toLowerCase().includes(searchTerm) ? 'high' : 'medium'
          });
        }
      });

      // Search progress entries
      const progressEntries = await storage.getUserProgressEntries(user.id);
      progressEntries.forEach(entry => {
        const searchableContent = [
          entry.journalEntry || '',
          Array.isArray(entry.activities) ? entry.activities.map((a: any) => a.activity).join(' ') : ''
        ].join(' ').toLowerCase();
        
        if (searchableContent.includes(searchTerm)) {
          results.push({
            type: 'progress',
            id: entry.id,
            title: `Progress - ${format(new Date(entry.entryDate), 'MMM d, yyyy')}`,
            content: entry.journalEntry || 'Daily activities logged',
            relevance: 'medium'
          });
        }
      });

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => a.relevance === 'high' ? -1 : b.relevance === 'high' ? 1 : 0)
        .slice(0, 50);

      res.json({ results: sortedResults });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Calendar integration routes
  app.get("/api/calendar/connect", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const authUrl = calendarService.getGoogleAuthUrl(user.id, req);
      res.json({ authUrl });
    } catch (error) {
      console.error("Calendar connect error:", error);
      res.status(500).json({ error: "Failed to get calendar authorization URL" });
    }
  });

  app.get("/api/calendar/callback", async (req, res) => {
    try {
      console.log("📅 Calendar callback received:", req.query);
      const { code, state: userId, error } = req.query;
      
      // Handle OAuth errors
      if (error) {
        console.error("📅 OAuth error:", error);
        return res.redirect('/?calendar=error&reason=' + encodeURIComponent(error as string));
      }
      
      if (!code || !userId) {
        console.error("📅 Missing required parameters:", { code: !!code, userId: !!userId });
        return res.status(400).json({ error: "Missing authorization code or user ID" });
      }

      const success = await calendarService.handleGoogleCallback(code as string, userId as string, req);
      
      if (success) {
        console.log("📅 Calendar connection successful, redirecting to app");
        res.redirect('/?calendar=connected');
      } else {
        console.log("📅 Calendar connection failed, redirecting with error");
        res.redirect('/?calendar=error');
      }
    } catch (error) {
      console.error("Calendar callback error:", error);
      res.redirect('/?calendar=error');
    }
  });

  app.post("/api/calendar/sync-todo", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { todoId } = req.body;
      
      if (!todoId) {
        return res.status(400).json({ error: "Todo ID is required" });
      }

      const todos = await storage.getUserTodos(user.id);
      const todo = todos.find(t => t.id === todoId);
      
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }

      const success = await calendarService.syncTodoToCalendar(user.id, todo);
      
      if (success) {
        res.json({ success: true, message: "Todo synced to calendar" });
      } else {
        res.status(400).json({ error: "Failed to sync todo to calendar" });
      }
    } catch (error) {
      console.error("Calendar sync error:", error);
      res.status(500).json({ error: "Failed to sync todo to calendar" });
    }
  });

  app.post("/api/calendar/sync-all", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const syncedCount = await calendarService.syncAllUserTodos(user.id);
      res.json({ success: true, syncedCount, message: `Synced ${syncedCount} todos to calendar` });
    } catch (error) {
      console.error("Calendar sync all error:", error);
      res.status(500).json({ error: "Failed to sync todos to calendar" });
    }
  });

  app.get("/api/calendar/status", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const settings = await storage.getUserSettings(user.id);
      const hasValidToken = await calendarService.ensureValidGoogleToken(user.id);
      
      res.json({
        connected: !!hasValidToken,
        enabled: settings?.calendarIntegrationEnabled || false,
        provider: settings?.calendarProvider || null
      });
    } catch (error) {
      console.error("Calendar status error:", error);
      res.status(500).json({ error: "Failed to get calendar status" });
    }
  });

  // Notification testing endpoints
  app.post("/api/notifications/test-local", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // For local notifications, we'll send back the data for the frontend to display
      res.json({ 
        success: true, 
        message: "Test notification ready",
        notification: {
          title: "MyLife Test Notification",
          body: message,
          icon: "/favicon.ico"
        }
      });
    } catch (error) {
      console.error("Test local notification error:", error);
      res.status(500).json({ error: "Failed to prepare test notification" });
    }
  });

  app.post("/api/notifications/test-email", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      const { message, email } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      // Send test email notification
      await sendVerificationEmail(email, "000000", message); // Using verification email as test
      
      res.json({ 
        success: true, 
        message: "Test email sent successfully",
        sentTo: email
      });
    } catch (error) {
      console.error("Test email notification error:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
