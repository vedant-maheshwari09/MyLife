import nodemailer from 'nodemailer';
import { IStorage } from './storage';
import type { User, UserSettings, Todo, ProgressEntry } from '@shared/schema';

export interface NotificationMessage {
  type: 'progress_reminder' | 'todo_reminder' | 'missed_todo';
  title: string;
  message: string;
  userId: string;
  todoId?: string;
}

export class NotificationService {
  private storage: IStorage;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPassword) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });
    }
  }

  async sendNotification(notification: NotificationMessage): Promise<void> {
    const user = await this.storage.getUser(notification.userId);
    if (!user) return;

    const settings = await this.storage.getUserSettings(notification.userId);
    if (!settings) return;

    // Check if notifications are enabled for this type
    const isEnabled = this.isNotificationEnabled(notification.type, settings);
    if (!isEnabled) return;

    if (settings.notificationType === 'email' && this.emailTransporter) {
      await this.sendEmailNotification(user, notification);
    }
    // Local notifications are handled by the frontend
  }

  private isNotificationEnabled(type: NotificationMessage['type'], settings: UserSettings): boolean {
    if (settings.notificationType === 'off') return false;

    switch (type) {
      case 'progress_reminder':
        return settings.progressNotificationEnabled;
      case 'todo_reminder':
        return settings.todoReminderEnabled;
      case 'missed_todo':
        return settings.missedTodoNotificationEnabled;
      default:
        return false;
    }
  }

  private async sendEmailNotification(user: User, notification: NotificationMessage): Promise<void> {
    if (!this.emailTransporter) return;

    const subject = `MyLife - ${notification.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">MyLife Notification</h2>
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          You're receiving this because you have email notifications enabled in your MyLife settings.
          <br>
          You can change your notification preferences in the app settings.
        </p>
      </div>
    `;

    await this.emailTransporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject,
      html,
    });
  }

  // Create notification messages
  createProgressReminder(userId: string): NotificationMessage {
    return {
      type: 'progress_reminder',
      title: 'Time to log your progress!',
      message: 'Take a moment to reflect on your day and log your progress.',
      userId,
    };
  }

  createTodoReminder(userId: string, todo: Todo): NotificationMessage {
    return {
      type: 'todo_reminder',
      title: 'Todo Reminder',
      message: `Don't forget: ${todo.title}`,
      userId,
      todoId: todo.id,
    };
  }

  createMissedTodoNotification(userId: string, todo: Todo): NotificationMessage {
    return {
      type: 'missed_todo',
      title: 'Missed Todo',
      message: `You missed the deadline for: ${todo.title}`,
      userId,
      todoId: todo.id,
    };
  }
}