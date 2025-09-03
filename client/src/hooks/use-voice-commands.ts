import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VoiceCommandResult {
  command: string;
  action: string;
  parameters: Record<string, any>;
}

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export function useVoiceCommands() {
  const [isListening, setIsListening] = useState(false);
  const [isDirectListening, setIsDirectListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [directRecognition, setDirectRecognition] = useState<SpeechRecognition | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [voiceTimeout, setVoiceTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Trigger-based recognition (Hey MyLife)
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
        console.log('Speech recognition ended');
      };
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Voice transcript:', transcript);
        
        // Check for trigger phrase - expanded to include more variations
        if (transcript.includes('hey mylife') || transcript.includes('hey my life') || 
            transcript.includes('hi mylife') || transcript.includes('hi my life') ||
            transcript.includes('hello mylife') || transcript.includes('hello my life') ||
            transcript.includes('my life') || transcript.toLowerCase().includes('mylife')) {
          
          // Stop the main recognition to prevent interference
          recognitionInstance.stop();
          
          // Show visual feedback with overlay
          setShowOverlay(true);
          setIsProcessing(true);
          
          // Provide audio acknowledgment
          speak("Yes? What can I help you with?");
          
          // Auto-start direct listening after acknowledgment
          setTimeout(() => {
            setIsProcessing(false);
            startDirectListening();
          }, 2000);
        }
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Needed",
            description: "Please allow microphone access to use 'Hey MyLife' voice commands. Check your browser's permission settings.",
            variant: "destructive",
          });
        } else if (event.error === 'no-speech') {
          // Don't auto-restart on no-speech to prevent loops
          console.log('No speech detected, waiting for manual restart');
        } else if (event.error === 'network') {
          toast({
            title: "Network Error",
            description: "Speech recognition requires an internet connection.",
            variant: "destructive",
          });
        }
      };
      
      setRecognition(recognitionInstance);
      
      // Direct recognition (no trigger phrase needed)
      const directRecognitionInstance = new SpeechRecognition();
      directRecognitionInstance.continuous = false;
      directRecognitionInstance.interimResults = false;
      directRecognitionInstance.lang = 'en-US';
      
      directRecognitionInstance.onstart = () => {
        setIsDirectListening(true);
      };
      
      directRecognitionInstance.onend = () => {
        setIsDirectListening(false);
        
        // Clear timeout when listening ends
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
      };
      
      directRecognitionInstance.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Direct voice transcript:', transcript);
        
        // Clear timeout when command is received
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
        
        // Process direct command (prepend "hey mylife" internally)
        handleVoiceCommand(`hey mylife ${transcript}`);
      };
      
      directRecognitionInstance.onerror = (event) => {
        console.error('Direct speech recognition error:', event.error);
        setIsDirectListening(false);
        
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Needed",
            description: "Please allow microphone access to use voice commands. Check your browser's permission settings.",
            variant: "destructive",
          });
        } else if (event.error === 'no-speech') {
          toast({
            title: "No Speech Detected",
            description: "I couldn't hear anything. Try again when you're ready.",
            variant: "default",
          });
        } else if (event.error === 'network') {
          toast({
            title: "Network Error",
            description: "Speech recognition requires an internet connection.",
            variant: "destructive",
          });
        }
        
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
      };
      
      setDirectRecognition(directRecognitionInstance);
      
      // Voice recognition ready - requires manual start
      console.log('Voice recognition initialized and ready');
    }
  }, []);

  const parseVoiceCommand = (transcript: string): VoiceCommandResult | null => {
    // Remove the trigger phrase and normalize
    const command = transcript.replace(/(hey|hi) (my)?life/gi, '').trim().toLowerCase();
    console.log('Processing command:', command);
    
    // Todo commands - Much more flexible patterns
    if (command.includes('add') && (command.includes('todo') || command.includes('task') || 
        command.includes('to my tasks') || command.match(/\btask\b/i))) {
      
      let todoText = '';
      let tab = 'personal';
      
      // Simple pattern: "add task [text]" or "add todo [text]"
      let match = command.match(/add\s+(?:task|todo)\s+(.+)/i);
      if (match) {
        todoText = match[1].trim();
      } else {
        // Pattern: "add [text] to tasks/todos"
        match = command.match(/add\s+(.+?)\s+to\s+(?:task|todo|my tasks|my todos)/i);
        if (match) {
          todoText = match[1].trim();
        } else {
          // Pattern: Just "add" followed by content that mentions task
          match = command.match(/add\s+(.+)/i);
          if (match && (command.includes('task') || command.includes('todo'))) {
            todoText = match[1].replace(/\s*(?:task|todo|to my tasks|to my todos)\s*$/i, '').trim();
          }
        }
      }
      
      if (todoText) {
        return {
          command: 'add_todo',
          action: 'create_todo',
          parameters: { text: todoText, tab }
        };
      }
    }
    
    // Timer commands - More flexible
    if ((command.includes('start') || command.includes('begin')) && 
        (command.includes('timer') || command.includes('tracking') || command.includes('time'))) {
      
      let activity = '';
      const startMatch = command.match(/(?:start|begin)\s+(?:timer|tracking|time)\s+(?:for\s+)?(.+)/i) ||
                        command.match(/(?:start|begin)\s+(.+?)\s+(?:timer|tracking|time)/i);
      
      if (startMatch) {
        activity = startMatch[1].trim();
      }
      
      return {
        command: 'start_timer',
        action: 'start_activity_timer',
        parameters: { activity }
      };
    }
    
    if ((command.includes('stop') || command.includes('end')) && 
        (command.includes('timer') || command.includes('tracking') || command.includes('time'))) {
      return {
        command: 'stop_timer',
        action: 'stop_activity_timer',
        parameters: {}
      };
    }
    
    // Goal commands - More flexible patterns
    if ((command.includes('add') || command.includes('create') || command.includes('set')) && 
        (command.includes('goal') || command.includes('objective') || command.includes('target'))) {
      
      let goalText = '';
      let match = command.match(/(?:add|create|set)\s+(?:goal|objective|target)\s+(.+)/i) ||
                  command.match(/(?:add|create|set)\s+(.+?)\s+(?:goal|objective|target)/i) ||
                  command.match(/(?:add|create|set)\s+(.+)/i);
      
      if (match) {
        goalText = match[1].replace(/\s*(?:goal|objective|target|to my goals)\s*$/i, '').trim();
      }
      
      if (goalText) {
        return {
          command: 'add_goal',
          action: 'create_goal',
          parameters: { title: goalText }
        };
      }
    }
    
    // Note commands - More flexible patterns  
    if (command.includes('add') && (command.includes('note') || command.includes('memo') || 
        command.includes('to my notes'))) {
      
      let noteText = '';
      
      // Simple pattern: "add note [text]"
      let match = command.match(/add\s+note\s+(.+)/i);
      if (match) {
        noteText = match[1].trim();
      } else {
        // Pattern: "add [text] to notes"
        match = command.match(/add\s+(.+?)\s+to\s+(?:note|my notes)/i);
        if (match) {
          noteText = match[1].trim();
        } else {
          // Pattern: Just "add" followed by content that mentions note
          match = command.match(/add\s+(.+)/i);
          if (match && (command.includes('note') || command.includes('memo'))) {
            noteText = match[1].replace(/\s*(?:note|memo|to my notes)\s*$/i, '').trim();
          }
        }
      }
      
      if (noteText) {
        return {
          command: 'add_note',
          action: 'create_note',
          parameters: { content: noteText }
        };
      }
    }
    
    // Status commands - More flexible
    if ((command.includes('what') || command.includes('how') || command.includes('show') || command.includes('check')) && 
        (command.includes('progress') || command.includes('status') || command.includes('doing') || command.includes('summary'))) {
      return {
        command: 'check_status',
        action: 'get_progress_summary',
        parameters: {}
      };
    }
    
    // Simple greetings and acknowledgments
    if (command.match(/^(hi|hello|hey)$/i) || command.trim() === '') {
      return {
        command: 'greeting',
        action: 'greeting',
        parameters: {}
      };
    }
    
    // Help commands
    if (command.includes('help') || command.includes('what can you do') || command.includes('commands')) {
      return {
        command: 'help',
        action: 'help',
        parameters: {}
      };
    }
    
    return null;
  };

  const executeVoiceCommand = async (commandResult: VoiceCommandResult) => {
    try {
      switch (commandResult.action) {
        case 'create_todo':
          await apiRequest('POST', '/api/todos', {
            text: commandResult.parameters.text,
            tab: commandResult.parameters.tab,
            completed: false
          });
          queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
          speak(`Done! Added "${commandResult.parameters.text}" to your ${commandResult.parameters.tab} todos. Should I set a due date or reminder for this task?`);
          break;
          
        case 'create_goal':
          await apiRequest('POST', '/api/goals', {
            title: commandResult.parameters.title,
            description: '',
            tab: 'personal'
          });
          queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
          speak(`Perfect! Added new goal: ${commandResult.parameters.title}. Would you like me to create any related todos or set a target date?`);
          break;
          
        case 'create_note':
          await apiRequest('POST', '/api/notes', {
            title: 'Voice Note',
            content: commandResult.parameters.content,
            tab: 'personal'
          });
          queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
          speak(`Got it! Saved your note: ${commandResult.parameters.content}. Anything else you'd like to add?`);
          break;
          
        case 'start_activity_timer':
          // Get all activities to find matching one
          const activities = await apiRequest('GET', '/api/activities');
          const matchingActivity = activities.find((activity: any) => 
            activity.title.toLowerCase().includes(commandResult.parameters.activity.toLowerCase())
          );
          
          if (matchingActivity) {
            await apiRequest('POST', '/api/time-sessions/start', { activityId: matchingActivity.id });
            queryClient.invalidateQueries({ queryKey: ['/api/time-sessions/active'] });
            speak(`Perfect! Started timer for ${matchingActivity.title}. Focus mode is now active!`);
          } else {
            speak(`I couldn't find an activity called ${commandResult.parameters.activity}. Would you like me to create it first?`);
          }
          break;
          
        case 'stop_activity_timer':
          await apiRequest('POST', '/api/time-sessions/stop', {});
          queryClient.invalidateQueries({ queryKey: ['/api/time-sessions/active'] });
          queryClient.invalidateQueries({ queryKey: ['/api/time-sessions'] });
          speak("Done! Timer stopped. Great work on staying focused!");
          break;
          
        case 'get_progress_summary':
          speak("Checking your progress...");
          break;
          
        case 'greeting':
          const greetings = [
            "Hello! How can I help you today?",
            "Hi there! What would you like to do?",
            "Hey! I'm here to help with your tasks and goals.",
            "Hello! Ready to be productive?"
          ];
          speak(greetings[Math.floor(Math.random() * greetings.length)]);
          break;
          
        case 'help':
          speak("I can help you with many things! Try saying: 'Add grocery shopping to my todos', 'Create a goal to exercise more', 'Start timer for work', or 'What's my progress today?'");
          break;
          
        default:
          const helpfulResponses = [
            "I didn't quite catch that. Try saying 'Add something to my todos' or 'Start timer for work'",
            "Sorry, I didn't understand. You can say things like 'Create a new goal' or 'Add a note about today'",
            "I'm not sure what you meant. Try 'Add task to do laundry' or 'Check my progress today'",
            "Let me help you! Say something like 'Add meeting notes' or 'Start timer for studying'"
          ];
          speak(helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)]);
      }
      
      // Reset processing state after command execution
      setTimeout(() => setIsProcessing(false), 1500);
    } catch (error) {
      console.error('Voice command execution error:', error);
      speak("Sorry, I couldn't complete that action. Please try again.");
      setTimeout(() => setIsProcessing(false), 1500);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = useCallback(async (transcript: string) => {
    console.log('Full transcript received:', transcript);
    setIsProcessing(true);
    
    try {
      // Send to Gemini backend for processing
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process voice command');
      }
      
      const result = await response.json();
      console.log('Gemini response:', result);
      
      // Speak the AI's response
      if (result.response) {
        speak(result.response);
      }
      
      // Execute the action
      if (result.action && result.parameters) {
        await executeVoiceCommand({
          command: result.action,
          action: result.action,
          parameters: result.parameters
        });
      }
      
      toast({
        title: "Voice command processed",
        description: result.response || "Command executed successfully",
      });
      
    } catch (error) {
      console.error('Voice command error:', error);
      const errorResponses = [
        "I'm having trouble processing that. Could you try again?",
        "Sorry, I didn't catch that. Please repeat your command.",
        "I'm having difficulty understanding. Try saying 'add task' or 'start timer'."
      ];
      
      speak(errorResponses[Math.floor(Math.random() * errorResponses.length)]);
      
      toast({
        title: "Voice command failed",
        description: "Please try speaking your command again",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsProcessing(false), 1500);
    }
  }, [toast]);

  const startListening = useCallback(() => {
    if (recognition && isSupported) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [recognition, isSupported]);

  const stopListening = useCallback(() => {
    // Stop both recognition instances
    if (recognition) {
      recognition.stop();
    }
    if (directRecognition) {
      directRecognition.stop();
    }
    
    // Clear any timeouts
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    if (voiceTimeout) {
      clearTimeout(voiceTimeout);
      setVoiceTimeout(null);
    }
    
    // Reset all states
    setIsListening(false);
    setIsDirectListening(false);
    setIsProcessing(false);
    setShowOverlay(false);
  }, [recognition, directRecognition, timeoutId, voiceTimeout]);

  const startDirectListening = useCallback(() => {
    if (directRecognition && isSupported && !isDirectListening) {
      try {
        directRecognition.start();
        toast({
          title: "Listening...",
          description: "Speak your command directly (no need for 'Hey MyLife')",
        });
        
        // Set 15-second auto-timeout
        const timeout = setTimeout(() => {
          if (directRecognition) {
            directRecognition.stop();
            setIsDirectListening(false);
            setShowOverlay(false);
            toast({
              title: "Voice timeout",
              description: "Automatically stopped listening after 15 seconds",
              variant: "default",
            });
          }
        }, 15000);
        
        setTimeoutId(timeout);
      } catch (error) {
        console.error('Failed to start direct recognition:', error);
      }
    }
  }, [directRecognition, isSupported, isDirectListening, toast]);

  const stopDirectListening = useCallback(() => {
    if (directRecognition && isDirectListening) {
      directRecognition.stop();
    }
    
    // Clear timeout when manually stopping
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [directRecognition, isDirectListening, timeoutId]);

  const closeOverlay = useCallback(() => {
    setShowOverlay(false);
    setIsProcessing(false);
    stopDirectListening();
  }, [stopDirectListening]);

  const toggleOverlayListening = useCallback(() => {
    if (isDirectListening) {
      stopDirectListening();
    } else {
      startDirectListening();
    }
  }, [isDirectListening, startDirectListening, stopDirectListening]);

  return {
    isListening,
    isDirectListening,
    isSupported,
    isProcessing,
    showOverlay,
    startListening,
    stopListening,
    startDirectListening,
    stopDirectListening,
    closeOverlay,
    toggleOverlayListening,
    speak
  };
}