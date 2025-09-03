import { storage } from "./storage";
import type { Todo, UserSettings } from "@shared/schema";

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
}

// Google Calendar API implementation
class GoogleCalendarService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Google Calendar credentials not found in environment variables');
    }
  }

  // Get the redirect URI dynamically based on the request
  private getRedirectUri(req?: any): string {
    // Try to get the host from the request if available
    if (req && req.get && req.get('host')) {
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const redirectUri = `${protocol}://${req.get('host')}/api/calendar/callback`;
      console.log(`📅 Using redirect URI from request: ${redirectUri}`);
      return redirectUri;
    }
    
    // Try common Replit environment variables
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      const redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app/api/calendar/callback`;
      console.log(`📅 Using redirect URI from Replit env: ${redirectUri}`);
      return redirectUri;
    }
    
    // Fallback to environment variables or default
    if (process.env.REPLIT_DOMAINS) {
      const redirectUri = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/calendar/callback`;
      console.log(`📅 Using redirect URI from REPLIT_DOMAINS: ${redirectUri}`);
      return redirectUri;
    }
    
    console.log(`📅 Using default localhost redirect URI`);
    return 'http://localhost:5000/api/calendar/callback';
  }

  // Generate OAuth authorization URL
  getAuthUrl(userId: string, req?: any): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const redirectUri = this.getRedirectUri(req);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: userId // Pass user ID to identify user after callback
    });

    console.log(`📅 Google OAuth URL generated with redirect_uri: ${redirectUri}`);
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  } | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        console.error('Token exchange failed:', await response.text());
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return null;
    }
  }

  // Create a calendar event
  async createEvent(accessToken: string, calendarId: string, event: CalendarEvent): Promise<string | null> {
    try {
      const googleEvent: any = {
        summary: event.title,
        description: event.description,
        start: event.allDay ? 
          { date: event.start.toISOString().split('T')[0] } :
          { dateTime: event.start.toISOString(), timeZone: 'America/New_York' },
        end: event.allDay ?
          { date: event.end.toISOString().split('T')[0] } :
          { dateTime: event.end.toISOString(), timeZone: 'America/New_York' },
      };
      
      // Add reminders if specified
      if (event.reminders) {
        googleEvent.reminders = event.reminders;
      }
      
      // Add recurrence if specified
      if (event.recurrence && event.recurrence.length > 0) {
        googleEvent.recurrence = event.recurrence;
      };
      
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        console.error('Failed to create Google Calendar event:', await response.text());
        return null;
      }

      const result = await response.json();
      console.log(`📅 Successfully created Google Calendar event: ${event.title}`);
      return result.id;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  }

  // Update a calendar event
  async updateEvent(accessToken: string, calendarId: string, eventId: string, event: CalendarEvent): Promise<boolean> {
    try {
      const googleEvent: any = {
        summary: event.title,
        description: event.description,
        start: event.allDay ? 
          { date: event.start.toISOString().split('T')[0] } :
          { dateTime: event.start.toISOString(), timeZone: 'America/New_York' },
        end: event.allDay ?
          { date: event.end.toISOString().split('T')[0] } :
          { dateTime: event.end.toISOString(), timeZone: 'America/New_York' },
      };
      
      // Add reminders if specified
      if (event.reminders) {
        googleEvent.reminders = event.reminders;
      }
      
      // Add recurrence if specified
      if (event.recurrence && event.recurrence.length > 0) {
        googleEvent.recurrence = event.recurrence;
      };
      
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        console.error('Failed to update Google Calendar event:', await response.text());
        return false;
      }

      console.log(`📅 Successfully updated Google Calendar event: ${event.title}`);
      return true;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  }

  // Delete a calendar event
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log(`📅 Successfully deleted Google Calendar event ${eventId}`);
      return response.ok;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  // Get user's calendars
  async getCalendars(accessToken: string) {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch Google calendars:', await response.text());
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
      return null;
    }
  }
}

const googleCalendarService = new GoogleCalendarService();

class CalendarIntegrationService {
  
  getAvailableProviders(): { id: string; name: string; authUrl: string }[] {
    return [{
      id: 'google',
      name: 'Google Calendar',
      authUrl: 'Connect with Google Calendar'
    }];
  }

  // Get Google Calendar authorization URL for a user
  getGoogleAuthUrl(userId: string, req?: any): string {
    return googleCalendarService.getAuthUrl(userId, req);
  }

  // Handle OAuth callback and store tokens
  async handleGoogleCallback(code: string, userId: string, req?: any): Promise<boolean> {
    try {
      const redirectUri = googleCalendarService.getRedirectUri(req);
      const tokens = await googleCalendarService.exchangeCodeForTokens(code, redirectUri);
      if (!tokens) {
        return false;
      }

      // Calculate expiry time
      const expiryTime = new Date();
      expiryTime.setSeconds(expiryTime.getSeconds() + tokens.expires_in);

      // Store tokens in user profile
      await storage.updateUser(userId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: expiryTime
      });

      // Enable calendar integration in user settings
      await this.enableCalendarIntegration(userId, 'google', tokens.access_token);

      console.log(`📅 Google Calendar connected for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error handling Google Calendar callback:', error);
      return false;
    }
  }

  // Check if user's Google token is valid and refresh if needed
  async ensureValidGoogleToken(userId: string): Promise<string | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.googleAccessToken) {
        return null;
      }

      // Check if token is expired
      if (user.googleTokenExpiry && new Date() > user.googleTokenExpiry) {
        // Try to refresh the token
        if (user.googleRefreshToken) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: user.googleRefreshToken,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshResponse.ok) {
            const tokens = await refreshResponse.json();
            const expiryTime = new Date();
            expiryTime.setSeconds(expiryTime.getSeconds() + tokens.expires_in);

            await storage.updateUser(userId, {
              googleAccessToken: tokens.access_token,
              googleTokenExpiry: expiryTime
            });

            return tokens.access_token;
          }
        }
        
        // Token refresh failed, clear stored tokens
        await storage.updateUser(userId, {
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null
        });
        
        return null;
      }

      return user.googleAccessToken;
    } catch (error) {
      console.error('Error ensuring valid Google token:', error);
      return null;
    }
  }
  
  // Build Google Calendar recurrence rule from todo repeat pattern
  private buildRecurrenceRule(todo: Todo): string[] {
    if (!todo.isRepeating || !todo.repeatPattern) {
      return [];
    }
    
    const rules: string[] = [];
    const interval = todo.repeatInterval || 1;
    
    switch (todo.repeatPattern) {
      case 'daily':
        rules.push(`RRULE:FREQ=DAILY;INTERVAL=${interval}`);
        break;
      case 'weekly':
        let rule = `RRULE:FREQ=WEEKLY;INTERVAL=${interval}`;
        if (todo.repeatDays && todo.repeatDays.length > 0) {
          // Convert day names to Google Calendar format
          const dayMap: { [key: string]: string } = {
            'monday': 'MO',
            'tuesday': 'TU', 
            'wednesday': 'WE',
            'thursday': 'TH',
            'friday': 'FR',
            'saturday': 'SA',
            'sunday': 'SU'
          };
          const days = todo.repeatDays.map(day => dayMap[day.toLowerCase()]).filter(Boolean);
          if (days.length > 0) {
            rule += `;BYDAY=${days.join(',')}`;
          }
        }
        rules.push(rule);
        break;
      case 'monthly':
        rules.push(`RRULE:FREQ=MONTHLY;INTERVAL=${interval}`);
        break;
      case 'yearly':
        rules.push(`RRULE:FREQ=YEARLY;INTERVAL=${interval}`);
        break;
    }
    
    return rules;
  }
  
  async syncTodoToCalendar(userId: string, todo: Todo): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings(userId);
      
      if (!settings?.calendarIntegrationEnabled || settings.calendarProvider !== 'google') {
        return false; // Calendar integration not enabled or not Google
      }
      
      // Get valid access token
      const accessToken = await this.ensureValidGoogleToken(userId);
      if (!accessToken) {
        console.log('No valid Google Calendar token available for user');
        return false;
      }
      
      // Convert todo to calendar event
      const event: CalendarEvent = {
        title: todo.title,
        description: todo.description || "",
        start: todo.dueDate || new Date(),
        end: todo.dueDate ? new Date(todo.dueDate.getTime() + 60 * 60 * 1000) : new Date(Date.now() + 60 * 60 * 1000), // 1 hour duration
        allDay: !todo.dueTime
      };
      
      // If todo has specific time, set it
      if (todo.dueTime && todo.dueDate) {
        const [hours, minutes] = todo.dueTime.split(':').map(Number);
        event.start.setHours(hours, minutes, 0, 0);
        event.end.setHours(hours + 1, minutes, 0, 0); // 1 hour duration
      }
      
      // Add reminders if todo has them
      if (todo.hasReminder && todo.reminderDate && todo.reminderTime) {
        const reminderDate = new Date(todo.reminderDate);
        const [reminderHours, reminderMinutes] = todo.reminderTime.split(':').map(Number);
        reminderDate.setHours(reminderHours, reminderMinutes, 0, 0);
        
        // Calculate minutes before event for reminder
        const minutesBefore = Math.max(0, Math.floor((event.start.getTime() - reminderDate.getTime()) / (1000 * 60)));
        
        event.reminders = {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: minutesBefore
            }
          ]
        };
      }
      
      // Add recurrence if todo is repeating
      if (todo.isRepeating && todo.repeatPattern) {
        const recurrenceRules = this.buildRecurrenceRule(todo);
        if (recurrenceRules.length > 0) {
          event.recurrence = recurrenceRules;
        }
      }
      
      const eventId = await googleCalendarService.createEvent(
        accessToken,
        settings.calendarId || 'primary',
        event
      );
      
      if (eventId) {
        console.log(`📅 Successfully synced todo "${todo.title}" to Google Calendar (Event ID: ${eventId})`);
        return true;
      } else {
        return false;
      }
      
    } catch (error) {
      console.error(`Error syncing todo to calendar:`, error);
      return false;
    }
  }
  
  async syncAllUserTodos(userId: string): Promise<number> {
    const todos = await storage.getUserTodos(userId);
    const incompleteTodos = todos.filter(todo => !todo.isCompleted && todo.dueDate);
    
    let syncedCount = 0;
    for (const todo of incompleteTodos) {
      const success = await this.syncTodoToCalendar(userId, todo);
      if (success) syncedCount++;
    }
    
    return syncedCount;
  }
  
  async enableCalendarIntegration(userId: string, provider: string, accessToken: string, calendarId?: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings(userId);
      
      const updatedSettings = {
        calendarIntegrationEnabled: true,
        calendarProvider: provider,
        calendarAccessToken: accessToken,
        calendarId: calendarId || 'primary'
      };
      
      if (settings) {
        await storage.updateUserSettings(userId, updatedSettings);
      } else {
        await storage.createUserSettings({
          userId,
          ...updatedSettings,
          darkMode: false,
          emailNotifications: true,
          progressNotificationTime: "18:00",
          language: "en",
          autoDetectLanguage: true
        });
      }
      
      console.log(`📅 Calendar integration enabled for user ${userId} with ${provider}`);
      return true;
      
    } catch (error) {
      console.error("Error enabling calendar integration:", error);
      return false;
    }
  }
  
  async disableCalendarIntegration(userId: string): Promise<boolean> {
    try {
      await storage.updateUserSettings(userId, {
        calendarIntegrationEnabled: false,
        calendarProvider: null,
        calendarAccessToken: null,
        calendarRefreshToken: null,
        calendarId: null
      });
      
      console.log(`📅 Calendar integration disabled for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error("Error disabling calendar integration:", error);
      return false;
    }
  }
}

export const calendarService = new CalendarIntegrationService();