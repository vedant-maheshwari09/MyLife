import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface VoiceCommandResponse {
  action: string;
  parameters: Record<string, any>;
  response?: string;
}

export async function processVoiceCommand(transcript: string): Promise<VoiceCommandResponse> {
  try {
    const systemPrompt = `You are a personal productivity assistant. Analyze the voice command and extract the action and parameters.
    
Available actions:
- add_todo: Add a new todo item (parameters: text, tab?)
- add_note: Add a new note (parameters: content)
- add_goal: Add a new goal (parameters: title)
- start_timer: Start activity timer (parameters: activity)
- stop_timer: Stop current timer
- check_status: Get progress summary
- greeting: Simple greeting
- help: Show available commands

Respond with JSON in this format:
{
  "action": "action_name",
  "parameters": {...},
  "response": "friendly confirmation message"
}

Examples:
- "add buy groceries to my tasks" -> {"action": "add_todo", "parameters": {"text": "buy groceries"}, "response": "I'll add 'buy groceries' to your tasks!"}
- "start timer for work" -> {"action": "start_timer", "parameters": {"activity": "work"}, "response": "Starting work timer now!"}
- "add note about meeting" -> {"action": "add_note", "parameters": {"content": "about meeting"}, "response": "I'll add that note for you!"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            action: { type: "string" },
            parameters: { type: "object" },
            response: { type: "string" },
          },
          required: ["action", "parameters"],
        },
      },
      contents: transcript,
    });

    const rawJson = response.text;
    console.log(`Gemini response: ${rawJson}`);

    if (rawJson) {
      const data: VoiceCommandResponse = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error('Gemini processing error:', error);
    // Fallback response
    return {
      action: "help",
      parameters: {},
      response: "I didn't understand that. Try saying 'add task to buy groceries' or 'start timer for work'."
    };
  }
}