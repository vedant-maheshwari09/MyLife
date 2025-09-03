import { GoogleGenAI } from "@google/genai";
import type { Goal, Activity, Todo, Note, ChatMemory, ProgressEntry } from "@shared/schema";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_ENV_VAR || "" 
});

interface UserContext {
  goals: Goal[];
  activities: Activity[];
  todos: Todo[];
  notes: Note[];
  progress: ProgressEntry[];
  memories: ChatMemory[];
}

export async function chatWithAI(message: string, context: UserContext): Promise<{ response: string; action?: TaskCommand }> {
  try {
    const systemPrompt = `You are MyLife AI Assistant, a helpful personal organization assistant. You have access to the user's:

GOALS: ${JSON.stringify(context.goals)}
ACTIVITIES: ${JSON.stringify(context.activities)}
TODOS: ${JSON.stringify(context.todos)}
NOTES: ${JSON.stringify(context.notes)}
PROGRESS: ${JSON.stringify(context.progress.map(p => ({ journalEntry: p.journalEntry, mood: p.mood, date: p.entryDate })))}
MEMORIES: ${JSON.stringify(context.memories.map(m => m.content))}

You can help with:
- Organizing and prioritizing tasks
- Setting and tracking goals
- Managing daily activities
- Providing life advice and motivation
- Analyzing progress patterns and mood trends
- Creating plans and schedules
- Evaluating whether activities align with goals and current state

SPECIAL COMMANDS:
If the user says something like "add task to...", "create a todo...", "remind me to...", "I need to...", extract the task information and respond with both a confirmation message AND a structured JSON action.

For task creation, respond with:
1. A friendly confirmation message
2. A JSON object on a new line starting with ACTION: containing:
   - type: "task", "goal", or "activity"
   - title: the main task description
   - description: additional details if provided
   - dueDate: if mentioned (format: YYYY-MM-DD)
   - priority: "low", "medium", or "high" based on urgency

Example:
"I'll add that task for you!
ACTION: {"type": "task", "title": "Buy groceries", "dueDate": "2025-01-15", "priority": "medium"}"

When users ask about activities or decisions, reference their goals, current todos, recent progress entries, and mood patterns to provide personalized advice. Be friendly, supportive, and provide actionable advice. Keep responses concise but helpful.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: message,
    });

    const responseText = response.text || "I'm sorry, I couldn't process that request. Please try again.";
    
    // Check if response contains an action command
    const actionMatch = responseText.match(/ACTION:\s*({[\s\S]*})/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        const cleanResponse = responseText.replace(/ACTION:\s*{[\s\S]*}/, '').trim();
        return { response: cleanResponse, action };
      } catch (e) {
        // If JSON parsing fails, return just the response
        return { response: responseText };
      }
    }
    
    return { response: responseText };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to get AI response");
  }
}

interface MemoryCommand {
  type: "memory" | "memory_chat" | "memory_last";
  content: string;
}

interface TaskCommand {
  type: "task" | "goal" | "activity";
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
}

export function parseMemoryCommand(message: string): MemoryCommand | null {
  const trimmed = message.trim();
  
  if (trimmed.startsWith("./mem ")) {
    const content = trimmed.substring(6).trim();
    
    if (content === "chat") {
      return {
        type: "memory_chat",
        content: "User wants to remember the current chat conversation"
      };
    } else if (content === "last message") {
      return {
        type: "memory_last",
        content: "User wants to remember the last message"
      };
    } else {
      return {
        type: "memory",
        content: content
      };
    }
  }
  
  return null;
}

export async function calculateTodoPriority(todo: Todo, context: UserContext): Promise<number> {
  let score = 0;
  const now = new Date();
  
  // Base priority score
  const priorityScores = { low: 1, medium: 3, high: 5 };
  score += priorityScores[todo.priority as keyof typeof priorityScores] || 3;
  
  // Deadline urgency (0-5 points)
  if (todo.dueDate) {
    const dueDate = new Date(todo.dueDate);
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 0) {
      score += 10; // Overdue tasks get highest priority
    } else if (daysUntilDue <= 1) {
      score += 5; // Due today or tomorrow
    } else if (daysUntilDue <= 3) {
      score += 3; // Due within 3 days
    } else if (daysUntilDue <= 7) {
      score += 2; // Due within a week
    } else if (daysUntilDue <= 30) {
      score += 1; // Due within a month
    }
  }
  
  // Goal alignment bonus (0-3 points)
  const relatedGoals = context.goals.filter(goal => 
    !goal.isCompleted && (
      goal.title.toLowerCase().includes(todo.title.toLowerCase().split(' ')[0]) ||
      todo.title.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0])
    )
  );
  
  if (relatedGoals.length > 0) {
    score += Math.min(relatedGoals.length * 1.5, 3); // Up to 3 bonus points
  }
  
  // Recent activity context (0-2 points)
  const recentProgress = context.progress.slice(-3);
  const hasRecentMention = recentProgress.some(entry => 
    entry.journalEntry?.toLowerCase().includes(todo.title.toLowerCase().split(' ')[0])
  );
  
  if (hasRecentMention) {
    score += 2; // Task mentioned in recent progress
  }
  
  // Frequency/importance indicator from title keywords
  const urgentKeywords = ['urgent', 'asap', 'critical', 'important', 'deadline'];
  const hasUrgentKeywords = urgentKeywords.some(keyword => 
    todo.title.toLowerCase().includes(keyword) || 
    todo.description?.toLowerCase().includes(keyword)
  );
  
  if (hasUrgentKeywords) {
    score += 3;
  }
  
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

export async function intelligentTodoPrioritization(todos: Todo[], context: UserContext): Promise<Todo[]> {
  const todoScores = await Promise.all(
    todos.map(async (todo) => ({
      todo,
      score: await calculateTodoPriority(todo, context)
    }))
  );
  
  return todoScores
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .map(item => item.todo);
}

export async function generateJournalingPrompts(context: UserContext): Promise<string[]> {
  try {
    const prompt = `Based on the user's recent activities, goals, and mood patterns, generate 3-4 thoughtful journaling prompts to help them reflect on their day and progress. Consider their current todos, recent achievements, and wellbeing trends.

User Context:
- Goals: ${context.goals.map(g => g.title).join(', ')}
- Recent todos: ${context.todos.slice(0, 5).map(t => t.title).join(', ')}
- Recent progress: ${context.progress.slice(-3).map(p => p.journalEntry?.substring(0, 50) || 'No journal entry').join(', ')}

Generate prompts that are:
- Personal and relevant to their current situation
- Encouraging reflection and growth
- Focused on progress, challenges, and insights
- Brief (1-2 sentences each)

Return the prompts as a JSON array of strings.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    try {
      const prompts = JSON.parse(response.text || '[]');
      return Array.isArray(prompts) ? prompts : [
        "What was the highlight of your day?",
        "What challenged you today and how did you handle it?",
        "What are you most grateful for right now?"
      ];
    } catch {
      return [
        "What was the highlight of your day?",
        "What challenged you today and how did you handle it?", 
        "What are you most grateful for right now?"
      ];
    }
  } catch (error) {
    console.error("Journaling prompts error:", error);
    return [
      "What was the highlight of your day?",
      "What challenged you today and how did you handle it?",
      "What are you most grateful for right now?"
    ];
  }
}

export async function summarizeForMemory(text: string): Promise<string> {
  try {
    const prompt = `Summarize the following text into 1-2 concise sentences for memory storage, focusing on the most important information:\n\n${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || text.substring(0, 100) + "...";
  } catch (error) {
    console.error("Memory summarization error:", error);
    return text.substring(0, 100) + "...";
  }
}
