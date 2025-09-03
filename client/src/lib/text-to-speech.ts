export class TextToSpeechService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSupported: boolean;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.isSupported = 'speechSynthesis' in window;
  }

  public isTextToSpeechSupported(): boolean {
    return this.isSupported;
  }

  public speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  } = {}): void {
    if (!this.isSupported) {
      console.warn('Text-to-speech not supported in this browser');
      return;
    }

    // Stop any current speech
    this.stop();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Set options
    this.currentUtterance.rate = options.rate ?? 0.9;
    this.currentUtterance.pitch = options.pitch ?? 1;
    this.currentUtterance.volume = options.volume ?? 0.8;
    
    if (options.voice) {
      this.currentUtterance.voice = options.voice;
    }

    // Set event handlers
    this.currentUtterance.onstart = () => options.onStart?.();
    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      options.onEnd?.();
    };
    this.currentUtterance.onerror = (error) => {
      this.currentUtterance = null;
      options.onError?.(error);
    };

    this.synthesis.speak(this.currentUtterance);
  }

  public stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public pause(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  public resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  public isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  public isPaused(): boolean {
    return this.synthesis.paused;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  public getPreferredVoice(lang: string = 'en-US'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    
    // Try to find a voice that matches the language
    const langVoices = voices.filter(voice => voice.lang.startsWith(lang.substring(0, 2)));
    
    if (langVoices.length > 0) {
      // Prefer local voices over remote ones
      const localVoice = langVoices.find(voice => voice.localService);
      return localVoice || langVoices[0];
    }
    
    // Fallback to any English voice
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
    if (englishVoices.length > 0) {
      const localVoice = englishVoices.find(voice => voice.localService);
      return localVoice || englishVoices[0];
    }
    
    // Fallback to first available voice
    return voices.length > 0 ? voices[0] : null;
  }
}

// Singleton instance
export const textToSpeechService = new TextToSpeechService();