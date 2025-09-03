import { sendTodoReminderEmail } from './email-service.js';
import { storage } from './storage.js';

class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('⏰ Reminder service is already running');
      return;
    }

    console.log('⏰ Starting reminder service - checking every minute for todo reminders');
    this.isRunning = true;
    
    // Check immediately on start
    this.checkReminders();
    
    // Then check every minute
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, 60000); // 60 seconds = 1 minute
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏰ Reminder service stopped');
  }

  private async checkReminders() {
    try {
      const currentTime = new Date();
      console.log(`⏰ Checking for reminders at ${currentTime.toLocaleTimeString()}`);
      
      const todosNeedingReminders = await storage.getTodosNeedingReminders(currentTime);
      
      if (todosNeedingReminders.length === 0) {
        return; // No reminders to send
      }

      console.log(`📬 Found ${todosNeedingReminders.length} todo(s) needing reminders`);

      // Send reminder emails
      for (const todo of todosNeedingReminders) {
        try {
          console.log(`📧 Sending reminder for: "${todo.title}" to ${todo.userEmail}`);
          
          await sendTodoReminderEmail(
            todo.userEmail,
            todo.title,
            todo.dueDate || undefined,
            todo.dueTime || undefined
          );
          
        } catch (error) {
          console.error(`❌ Failed to send reminder for todo "${todo.title}":`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error checking reminders:', error);
    }
  }

  // Helper method to manually trigger reminder check (for testing)
  async triggerCheck() {
    console.log('🔄 Manually triggering reminder check...');
    await this.checkReminders();
  }
}

// Create and export singleton instance
export const reminderService = new ReminderService();