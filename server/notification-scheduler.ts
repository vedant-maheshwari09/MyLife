import { IStorage } from './storage';
import { NotificationService } from './notification-service';
import type { Todo, UserSettings } from '@shared/schema';

export class NotificationScheduler {
  private storage: IStorage;
  private notificationService: NotificationService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.notificationService = new NotificationService(storage);
  }

  start(): void {
    console.log('📢 Starting notification scheduler - checking every minute');
    this.checkNotifications(); // Run immediately
    this.intervalId = setInterval(() => {
      this.checkNotifications();
    }, 60000); // Check every minute
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📢 Notification scheduler stopped');
    }
  }

  private async checkNotifications(): Promise<void> {
    const now = new Date();
    console.log(`📢 Checking for notifications at ${now.toLocaleTimeString()}`);

    try {
      await this.checkProgressReminders(now);
      await this.checkTodoReminders(now);
      await this.checkMissedTodos(now);
    } catch (error) {
      console.error('📢 Error checking notifications:', error);
    }
  }

  private async checkProgressReminders(now: Date): Promise<void> {
    // Get all users
    const users = await this.storage.getAllUsers();
    
    for (const user of users) {
      const settings = await this.storage.getUserSettings(user.id);
      if (!settings || !settings.progressNotificationEnabled) continue;

      const notificationTime = settings.progressNotificationTime; // Format: "18:00"
      const [hours, minutes] = notificationTime.split(':').map(Number);

      // Check if it's time for progress reminder (within the current minute)
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        // Check if user already logged progress today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const todayEntries = await this.storage.getProgressEntriesByDateRange(
          user.id,
          todayStart,
          todayEnd
        );

        if (todayEntries.length === 0) {
          const notification = this.notificationService.createProgressReminder(user.id);
          await this.notificationService.sendNotification(notification);
        }
      }
    }
  }

  private async checkTodoReminders(now: Date): Promise<void> {
    // Get all users
    const users = await this.storage.getAllUsers();
    
    for (const user of users) {
      const settings = await this.storage.getUserSettings(user.id);
      if (!settings || !settings.todoReminderEnabled) continue;

      const todos = await this.storage.getUserTodos(user.id);
      
      for (const todo of todos) {
        if (todo.isCompleted || !todo.hasReminder || !todo.reminderDate || !todo.reminderTime) {
          continue;
        }

        const reminderDateTime = new Date(todo.reminderDate);
        const [hours, minutes] = todo.reminderTime.split(':').map(Number);
        reminderDateTime.setHours(hours, minutes, 0, 0);

        // Check if it's time for the reminder (within the current minute)
        const timeDiff = Math.abs(now.getTime() - reminderDateTime.getTime());
        if (timeDiff < 60000) { // Within 1 minute
          const notification = this.notificationService.createTodoReminder(user.id, todo);
          await this.notificationService.sendNotification(notification);
        }
      }
    }
  }

  private async checkMissedTodos(now: Date): Promise<void> {
    // Get all users
    const users = await this.storage.getAllUsers();
    
    for (const user of users) {
      const settings = await this.storage.getUserSettings(user.id);
      if (!settings || !settings.missedTodoNotificationEnabled) continue;

      const todos = await this.storage.getUserTodos(user.id);
      
      for (const todo of todos) {
        if (todo.isCompleted || !todo.dueDate) continue;

        const dueDateTime = new Date(todo.dueDate);
        if (todo.dueTime) {
          const [hours, minutes] = todo.dueTime.split(':').map(Number);
          dueDateTime.setHours(hours, minutes, 0, 0);
        } else {
          dueDateTime.setHours(23, 59, 59, 999); // End of day if no specific time
        }

        // Check if todo is overdue (missed)
        if (now > dueDateTime) {
          // Check if we already sent a missed notification for this todo
          // You might want to add a field to track sent notifications
          // For now, we'll send notification once per day after the deadline
          const daysSinceDue = Math.floor((now.getTime() - dueDateTime.getTime()) / (1000 * 60 * 60 * 24));
          
          // Send notification on the day it's missed and then weekly
          if (daysSinceDue === 0 || (daysSinceDue > 0 && daysSinceDue % 7 === 0)) {
            const notification = this.notificationService.createMissedTodoNotification(user.id, todo);
            await this.notificationService.sendNotification(notification);
          }
        }
      }
    }
  }
}