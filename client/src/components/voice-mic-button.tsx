import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { useVoiceCommands } from "@/hooks/use-voice-commands";

export function VoiceMicButton() {
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

  const handleClick = () => {
    if (isActive) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`fixed top-20 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
        isActive 
          ? "bg-primary text-primary-foreground shadow-primary/30" 
          : "bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      data-testid="voice-mic-button"
    >
      {isActive ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </motion.button>
  );
}