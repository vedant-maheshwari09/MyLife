import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Bot, User as UserIcon, Brain, Volume2, VolumeX, Pause, Play, Mic, MicOff, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MemoryModal from "@/components/modals/memory-modal";
import { textToSpeechService } from "@/lib/text-to-speech";
import { VoiceLanguageDetector } from "@/lib/speech-recognition";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

interface ChatbotExpandedProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatbotExpanded({ onClose }: ChatbotExpandedProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hi! I'm your AI assistant. I can help you organize your life, provide guidance, and answer questions about your goals, activities, todos, and notes. How can I help you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDetector, setVoiceDetector] = useState<VoiceLanguageDetector | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: (data) => {
      const botMessage: ChatMessage = {
        id: Date.now().toString() + "_bot",
        content: data.response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Auto-speak bot responses if voice is enabled
      if (voiceEnabled && textToSpeechService.isTextToSpeechSupported()) {
        speakMessage(data.response, botMessage.id);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const speakMessage = (text: string, messageId: string) => {
    if (!textToSpeechService.isTextToSpeechSupported()) {
      toast({
        title: "Speech not supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    setIsSpeaking(true);
    setSpeakingMessageId(messageId);

    const preferredVoice = textToSpeechService.getPreferredVoice();
    textToSpeechService.speak(text, {
      rate: 0.9,
      pitch: 1,
      volume: 0.8,
      voice: preferredVoice || undefined,
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        toast({
          title: "Speech error",
          description: "Failed to speak the message.",
          variant: "destructive",
        });
      }
    });
  };

  const stopSpeaking = () => {
    textToSpeechService.stop();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const toggleVoice = () => {
    if (voiceEnabled && isSpeaking) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const startRecording = async () => {
    if (!voiceDetector || !voiceDetector.isSupported()) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      setDetectedLanguage(null);
      
      const result = await voiceDetector.detectLanguageAndTranscribe();
      
      if (result.transcript) {
        setInputMessage(result.transcript);
        setDetectedLanguage(result.detectedLanguage);
      }
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Failed to record audio. Please try again.",
        variant: "destructive",
      });
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    if (voiceDetector && isRecording) {
      voiceDetector.stopListening();
    }
    setIsRecording(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize voice detector
  useEffect(() => {
    const detector = new VoiceLanguageDetector();
    setVoiceDetector(detector);
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        textToSpeechService.stop();
      }
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + "_user",
      content: inputMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(inputMessage.trim());
    setInputMessage("");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="box-expanded">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-chatbot">
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleVoice}
              data-testid="button-toggle-voice"
              className={`${voiceEnabled ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
              title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            {isSpeaking && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={stopSpeaking}
                data-testid="button-stop-speaking"
                className="text-destructive hover:text-destructive"
                title="Stop speaking"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMemoryModalOpen(true)}
              data-testid="button-memory-management"
              className="text-muted-foreground hover:text-primary"
            >
              <Brain className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto flex flex-col h-full">
        {/* Chat Messages */}
        <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto" data-testid="chat-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : ''}`}
              data-testid={`message-${message.id}`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {message.isUser ? (
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-accent-foreground">
                      {user ? getInitials(user.name) : "U"}
                    </span>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className={`max-w-[80%] ${message.isUser ? 'text-right' : ''}`}>
                <div className={`rounded-xl p-3 ${
                  message.isUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className={`flex items-center gap-2 mt-1 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                  {!message.isUser && textToSpeechService.isTextToSpeechSupported() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakingMessageId === message.id ? stopSpeaking() : speakMessage(message.content, message.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      data-testid={`button-speak-${message.id}`}
                      title={speakingMessageId === message.id ? "Stop speaking" : "Speak message"}
                    >
                      {speakingMessageId === message.id ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-xl p-3 max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything... (use ./mem to save to memory)"
              className="flex-1"
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={chatMutation.isPending}
              data-testid="button-voice-input"
              className={isRecording ? "text-destructive" : ""}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button 
              type="submit" 
              disabled={!inputMessage.trim() || chatMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="text-destructive animate-pulse">🎤 Recording...</span>
              </div>
            )}
            {detectedLanguage && (
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>Language detected: {SUPPORTED_LANGUAGES[detectedLanguage as keyof typeof SUPPORTED_LANGUAGES]?.nativeName || detectedLanguage}</span>
              </div>
            )}
            <p>💡 Memory commands: ./mem &lt;text&gt;, ./mem chat, ./mem last message</p>
          </div>
        </div>
      </div>

      {/* Memory Management Modal */}
      <MemoryModal 
        isOpen={isMemoryModalOpen} 
        onClose={() => setIsMemoryModalOpen(false)} 
      />
    </div>
  );
}
