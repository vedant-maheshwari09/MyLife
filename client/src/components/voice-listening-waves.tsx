import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VoiceListeningWavesProps {
  isListening: boolean;
  isProcessing: boolean;
  isDirectListening: boolean;
  className?: string;
}

export default function VoiceListeningWaves({ 
  isListening, 
  isProcessing, 
  isDirectListening, 
  className = "" 
}: VoiceListeningWavesProps) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(isListening || isProcessing || isDirectListening);
  }, [isListening, isProcessing, isDirectListening]);

  // Dynamic wave animation that simulates different audio levels
  const getWaveVariants = (index: number) => ({
    inactive: {
      scaleY: 0.2 + (index * 0.05),
      opacity: 0.3,
    },
    active: {
      scaleY: [
        0.2 + (index * 0.05), 
        0.6 + (index * 0.15) + Math.random() * 0.4, 
        0.2 + (index * 0.05)
      ],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 0.8 + (index * 0.2) + Math.random() * 0.4,
        repeat: Infinity,
        ease: "easeInOut",
      }
    },
    processing: {
      scaleY: [
        0.4 + (index * 0.1), 
        0.8 + Math.random() * 0.6, 
        0.4 + (index * 0.1)
      ],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 0.5 + Math.random() * 0.3,
        repeat: Infinity,
        ease: "easeInOut",
      }
    }
  });

  const getAnimationState = () => {
    if (isProcessing) return "processing";
    if (isActive) return "active";
    return "inactive";
  };

  const getWaveColor = () => {
    if (isProcessing) return "bg-yellow-500 dark:bg-yellow-400";
    if (isDirectListening) return "bg-green-500 dark:bg-green-400";
    if (isListening) return "bg-blue-500 dark:bg-blue-400";
    return "bg-muted";
  };

  const getGlowColor = () => {
    if (isProcessing) return "shadow-yellow-500/50 dark:shadow-yellow-400/50";
    if (isDirectListening) return "shadow-green-500/50 dark:shadow-green-400/50";
    if (isListening) return "shadow-blue-500/50 dark:shadow-blue-400/50";
    return "";
  };

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* Create 5 wave bars */}
      {Array.from({ length: 5 }).map((_, index) => (
        <motion.div
          key={index}
          className={`w-1 h-8 rounded-full ${getWaveColor()} ${
            isActive ? `shadow-lg ${getGlowColor()}` : ""
          }`}
          variants={getWaveVariants(index)}
          animate={getAnimationState()}
          transition={{
            delay: index * 0.1, // Stagger the animation
          }}
        />
      ))}
      
      {/* Status indicator */}
      {isActive && (
        <motion.div
          className="ml-3 flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${
              isProcessing 
                ? "bg-yellow-500 dark:bg-yellow-400" 
                : isDirectListening 
                ? "bg-green-500 dark:bg-green-400"
                : "bg-blue-500 dark:bg-blue-400"
            }`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {isProcessing 
              ? "Processing..." 
              : isDirectListening 
              ? "Listening..."
              : "Detecting wake word..."
            }
          </span>
        </motion.div>
      )}
    </div>
  );
}