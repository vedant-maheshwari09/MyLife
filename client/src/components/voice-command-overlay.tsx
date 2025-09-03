import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceListeningWaves from "./voice-listening-waves";

interface VoiceCommandOverlayProps {
  isVisible: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isDirectListening: boolean;
  onClose: () => void;
  onToggleListening: () => void;
}

export default function VoiceCommandOverlay({
  isVisible,
  isListening,
  isProcessing,
  isDirectListening,
  onClose,
  onToggleListening
}: VoiceCommandOverlayProps) {
  
  const getTitle = () => {
    if (isProcessing) return "Processing your command...";
    if (isDirectListening) return "I'm listening, speak now!";
    if (isListening) return "Say 'Hey MyLife' to get started";
    return "Voice Commands Ready";
  };

  const getSubtitle = () => {
    if (isProcessing) return "Understanding what you said";
    if (isDirectListening) return "Speak your command clearly";
    if (isListening) return "I'm waiting for your wake word";
    return "Voice recognition is active";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Floating overlay */}
          <motion.div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 max-w-[90vw]"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  className="flex justify-center mb-3"
                  animate={{
                    scale: isProcessing ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: isProcessing ? 1 : 0,
                    repeat: isProcessing ? Infinity : 0,
                  }}
                >
                  {isProcessing ? (
                    <Brain className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                  ) : isDirectListening ? (
                    <Mic className="w-8 h-8 text-green-500 dark:text-green-400" />
                  ) : (
                    <Mic className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                  )}
                </motion.div>
                
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {getTitle()}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getSubtitle()}
                </p>
              </div>

              {/* Visual waves */}
              <div className="flex justify-center mb-6">
                <VoiceListeningWaves
                  isListening={isListening}
                  isProcessing={isProcessing}
                  isDirectListening={isDirectListening}
                />
              </div>

              {/* Quick commands */}
              {!isProcessing && (
                <div className="space-y-3 mb-6">
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    Quick Examples:
                  </div>
                  <div className="space-y-1">
                    {[
                      "Add grocery shopping to my todos",
                      "Start timer for exercise",
                      "Add learn Spanish to my goals"
                    ].map((command, index) => (
                      <motion.div
                        key={index}
                        className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        "Hey MyLife, {command}"
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {isDirectListening ? (
                  <Button
                    onClick={onToggleListening}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-stop-listening"
                  >
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Listening
                  </Button>
                ) : !isProcessing && (
                  <Button
                    onClick={onToggleListening}
                    className="flex-1"
                    data-testid="button-start-listening"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Direct Command
                  </Button>
                )}
                
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="flex-1"
                  data-testid="button-close-overlay"
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}