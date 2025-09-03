import { storage } from "./storage";
import type { Todo, InsertTodo } from "@shared/schema";

interface RepetitionConfig {
  pattern: string; // "daily", "weekly", "monthly", "yearly"
  interval: number; // repeat every X days/weeks/months
  daysOfWeek?: string[]; // for weekly: ["monday", "wednesday"]
}

class RepetitionService {
  
  /**
   * Calculate the next occurrence date for a repeating todo
   */
  calculateNextOccurrence(baseDate: Date, config: RepetitionConfig): Date {
    const nextDate = new Date(baseDate);
    
    switch (config.pattern) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + config.interval);
        break;
        
      case "weekly":
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          // Find next occurrence based on selected days
          nextDate.setDate(nextDate.getDate() + (7 * config.interval));
        } else {
          // Default to same day of week
          nextDate.setDate(nextDate.getDate() + (7 * config.interval));
        }
        break;
        
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + config.interval);
        break;
        
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + config.interval);
        break;
        
      default:
        throw new Error(`Unknown repeat pattern: ${config.pattern}`);
    }
    
    return nextDate;
  }
  
  /**
   * Generate the next occurrence of a repeating todo when current one is completed
   */
  async generateNextOccurrence(completedTodo: Todo): Promise<Todo | null> {
    if (!completedTodo.isRepeating || !completedTodo.dueDate || !completedTodo.repeatPattern) {
      return null;
    }
    
    const config: RepetitionConfig = {
      pattern: completedTodo.repeatPattern,
      interval: completedTodo.repeatInterval || 1,
      daysOfWeek: completedTodo.repeatDays || undefined
    };
    
    try {
      const nextDueDate = this.calculateNextOccurrence(completedTodo.dueDate, config);
      
      // Create the next occurrence
      const nextTodoData: InsertTodo = {
        userId: completedTodo.userId,
        title: completedTodo.title,
        description: completedTodo.description,
        dueDate: nextDueDate,
        dueTime: completedTodo.dueTime,
        priority: completedTodo.priority,
        hasReminder: completedTodo.hasReminder,
        reminderDate: completedTodo.hasReminder ? this.calculateReminderDate(nextDueDate, completedTodo) : undefined,
        reminderTime: completedTodo.reminderTime,
        isRepeating: completedTodo.isRepeating,
        repeatPattern: completedTodo.repeatPattern,
        repeatInterval: completedTodo.repeatInterval,
        repeatDays: completedTodo.repeatDays,
        tags: completedTodo.tags
      };
      
      const nextTodo = await storage.createTodo(nextTodoData);
      
      console.log(`🔄 Generated next occurrence for repeating todo: "${nextTodo.title}" (Due: ${nextDueDate.toLocaleDateString()})`);
      
      return nextTodo;
      
    } catch (error) {
      console.error("Error generating next todo occurrence:", error);
      return null;
    }
  }
  
  /**
   * Calculate reminder date based on the original reminder offset
   */
  private calculateReminderDate(dueDate: Date, originalTodo: Todo): Date | undefined {
    if (!originalTodo.reminderDate || !originalTodo.dueDate) {
      return undefined;
    }
    
    // Calculate the offset between original due date and reminder date
    const offsetMs = originalTodo.dueDate.getTime() - originalTodo.reminderDate.getTime();
    
    // Apply the same offset to the new due date
    return new Date(dueDate.getTime() - offsetMs);
  }
  
  /**
   * Get a description of the repetition pattern for display
   */
  getRepetitionDescription(todo: Todo): string {
    if (!todo.isRepeating || !todo.repeatPattern) {
      return "";
    }
    
    const interval = todo.repeatInterval || 1;
    const pattern = todo.repeatPattern;
    
    switch (pattern) {
      case "daily":
        return interval === 1 ? "Daily" : `Every ${interval} days`;
        
      case "weekly":
        if (todo.repeatDays && todo.repeatDays.length > 0) {
          const dayStr = todo.repeatDays.join(", ");
          return interval === 1 ? `Weekly on ${dayStr}` : `Every ${interval} weeks on ${dayStr}`;
        }
        return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
        
      case "monthly":
        return interval === 1 ? "Monthly" : `Every ${interval} months`;
        
      case "yearly":
        return interval === 1 ? "Yearly" : `Every ${interval} years`;
        
      default:
        return `Repeats ${pattern}`;
    }
  }
  
  /**
   * Check if a todo should generate its next occurrence when completed
   */
  shouldGenerateNext(todo: Todo): boolean {
    return todo.isRepeating && 
           todo.isCompleted && 
           !!todo.repeatPattern && 
           !!todo.dueDate;
  }
}

export const repetitionService = new RepetitionService();