import { format, isToday, isTomorrow, isYesterday, differenceInDays, startOfDay, endOfDay } from "date-fns";

export function formatRelativeDate(date: Date): string {
  if (isToday(date)) {
    return "Today";
  } else if (isTomorrow(date)) {
    return "Tomorrow";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    const daysDiff = differenceInDays(date, new Date());
    if (daysDiff > 0 && daysDiff <= 7) {
      return `In ${daysDiff} days`;
    } else if (daysDiff < 0 && daysDiff >= -7) {
      return `${Math.abs(daysDiff)} days ago`;
    } else {
      return format(date, "MMM d, yyyy");
    }
  }
}

export function formatTime(time: string): string {
  if (!time) return "";
  
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const date = new Date();
    date.setHours(hour, minute);
    
    return format(date, "h:mm a");
  } catch (error) {
    return time;
  }
}

export function getTodayDateRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: startOfDay(today),
    end: endOfDay(today)
  };
}

export function getTomorrowDateRange(): { start: Date; end: Date } {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    start: startOfDay(tomorrow),
    end: endOfDay(tomorrow)
  };
}

export function getWeekDateRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)
  
  return {
    start: startOfDay(start),
    end: endOfDay(end)
  };
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatTimeForInput(date: Date): string {
  return format(date, "HH:mm");
}

export function parseTimeString(timeString: string): { hours: number; minutes: number } | null {
  if (!timeString) return null;
  
  try {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return { hours, minutes };
  } catch (error) {
    return null;
  }
}

export function combineDateAndTime(date: Date, timeString: string): Date {
  const newDate = new Date(date);
  const time = parseTimeString(timeString);
  
  if (time) {
    newDate.setHours(time.hours, time.minutes, 0, 0);
  }
  
  return newDate;
}

export function getTimeUntilDate(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Overdue";
  }
  
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));
  
  if (diffDays > 1) {
    return `${diffDays} days`;
  } else if (diffHours > 1) {
    return `${diffHours} hours`;
  } else {
    return `${diffMinutes} minutes`;
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return "Good Morning";
  } else if (hour < 17) {
    return "Good Afternoon";
  } else {
    return "Good Evening";
  }
}

export function formatDateLong(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function isSameDate(date1: Date, date2: Date): boolean {
  return format(date1, "yyyy-MM-dd") === format(date2, "yyyy-MM-dd");
}
