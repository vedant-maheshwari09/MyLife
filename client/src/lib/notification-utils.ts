export interface LocalNotification {
  type: 'progress_reminder' | 'todo_reminder' | 'missed_todo';
  title: string;
  message: string;
  todoId?: string;
}

export class LocalNotificationService {
  private static instance: LocalNotificationService;

  private constructor() {}

  public static getInstance(): LocalNotificationService {
    if (!LocalNotificationService.instance) {
      LocalNotificationService.instance = new LocalNotificationService();
    }
    return LocalNotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(notification: LocalNotification): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('Notification permission denied');
      return;
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `mylife-${notification.type}-${notification.todoId || 'general'}`,
      requireInteraction: true
    };

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
      
      // Navigate to relevant page based on notification type
      switch (notification.type) {
        case 'progress_reminder':
          window.location.hash = '#/progress';
          break;
        case 'todo_reminder':
        case 'missed_todo':
          window.location.hash = '#/todos';
          break;
      }
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 10000);
  }

  createProgressReminder(): LocalNotification {
    return {
      type: 'progress_reminder',
      title: 'Time to log your progress!',
      message: 'Take a moment to reflect on your day and log your progress.',
    };
  }

  createTodoReminder(todoTitle: string, todoId: string): LocalNotification {
    return {
      type: 'todo_reminder',
      title: 'Todo Reminder',
      message: `Don't forget: ${todoTitle}`,
      todoId,
    };
  }

  createMissedTodoNotification(todoTitle: string, todoId: string): LocalNotification {
    return {
      type: 'missed_todo',
      title: 'Missed Todo',
      message: `You missed the deadline for: ${todoTitle}`,
      todoId,
    };
  }
}

export const localNotificationService = LocalNotificationService.getInstance();