import { motion } from "framer-motion";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import VoiceListeningWaves from "./voice-listening-waves";
import { Mic, MicOff } from "lucide-react";

export function VoiceStatusBar() {
  const { 
    isListening, 
    isDirectListening, 
    isProcessing, 
    isSupported,
    startListening,
    stopListening
  } = useVoiceCommands();

  if (!isSupported) {
    return null;
  }

  const isActive = isListening || isDirectListening || isProcessing;

  // Only show when actively listening or processing commands
  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-16 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Voice Waves */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {isProcessing ? "Processing..." : 
               isDirectListening ? "Listening for command..." :
               "Waiting for 'Hey MyLife'..."}
            </span>
          </div>
          
          <VoiceListeningWaves
            isListening={isListening}
            isProcessing={isProcessing}
            isDirectListening={isDirectListening}
            className="flex-shrink-0"
          />
        </div>

        {/* Manual Control */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            isActive 
              ? "bg-primary/10 text-primary border border-primary/20" 
              : "bg-muted text-muted-foreground border border-border"
          }`}
          disabled={isProcessing}
        >
          {isListening ? "Stop" : "Start"}
        </button>
      </div>
    </motion.div>
  );
}