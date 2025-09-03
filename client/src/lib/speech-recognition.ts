// Language detection and speech recognition utilities

export const SPEECH_LANGUAGE_CODES = {
  en: "en-US",
  es: "es-ES", 
  zh: "zh-CN",
  hi: "hi-IN",
  fr: "fr-FR"
} as const;

export interface SpeechRecognitionResult {
  transcript: string;
  detectedLanguage: string;
  confidence: number;
}

export class VoiceLanguageDetector {
  private recognition: any;
  private isListening: boolean = false;

  constructor() {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;
  }

  async detectLanguageAndTranscribe(
    preferredLanguage: string = "en",
    autoDetect: boolean = true
  ): Promise<SpeechRecognitionResult> {
    if (!this.recognition) {
      throw new Error("Speech recognition not supported in this browser");
    }

    if (this.isListening) {
      throw new Error("Already listening");
    }

    return new Promise((resolve, reject) => {
      this.isListening = true;

      // If auto-detection is disabled, use preferred language
      if (!autoDetect) {
        this.recognition.lang = SPEECH_LANGUAGE_CODES[preferredLanguage as keyof typeof SPEECH_LANGUAGE_CODES] || "en-US";
        
        this.recognition.onresult = (event: any) => {
          const result = event.results[0];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          resolve({
            transcript,
            detectedLanguage: preferredLanguage,
            confidence
          });
        };
      } else {
        // Try to detect language by testing multiple languages
        this.attemptLanguageDetection(preferredLanguage, resolve, reject);
      }

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    });
  }

  private async attemptLanguageDetection(
    preferredLanguage: string,
    resolve: (result: SpeechRecognitionResult) => void,
    reject: (error: Error) => void
  ) {
    // Start with preferred language
    const languagesToTry = [
      preferredLanguage,
      ...Object.keys(SPEECH_LANGUAGE_CODES).filter(lang => lang !== preferredLanguage)
    ];

    let bestResult: SpeechRecognitionResult | null = null;
    let currentIndex = 0;

    const tryNextLanguage = () => {
      if (currentIndex >= languagesToTry.length) {
        if (bestResult) {
          resolve(bestResult);
        } else {
          reject(new Error("Could not detect language or transcribe speech"));
        }
        return;
      }

      const langCode = languagesToTry[currentIndex];
      const speechLang = SPEECH_LANGUAGE_CODES[langCode as keyof typeof SPEECH_LANGUAGE_CODES];
      
      this.recognition.lang = speechLang;
      
      this.recognition.onresult = (event: any) => {
        const result = event.results[0];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        // If this is a good result, use it
        if (confidence > 0.7 || currentIndex === 0) {
          resolve({
            transcript,
            detectedLanguage: langCode,
            confidence
          });
          return;
        }

        // Store as best result if it's better than current best
        if (!bestResult || confidence > bestResult.confidence) {
          bestResult = {
            transcript,
            detectedLanguage: langCode,
            confidence
          };
        }

        currentIndex++;
        tryNextLanguage();
      };
    };

    tryNextLanguage();
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}