// Type definitions for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Speech recognition service
export class SpeechRecognitionService {
  private recognition: any;
  private isListening = false;
  private transcript = "";
  private onTranscriptChange: (transcript: string) => void = () => {};
  private onStatusChange: (isListening: boolean) => void = () => {};
  private onError: (error: string) => void = () => {};

  constructor() {
    // Check if browser supports speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.configureRecognition();
      }
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the transcript with both final and interim results
      this.transcript = finalTranscript || interimTranscript;
      this.onTranscriptChange(this.transcript);
    };

    this.recognition.onend = () => {
      // If we're supposed to be listening but recognition stopped, restart it
      if (this.isListening) {
        // Add a small delay before restarting to prevent rapid restart loops
        setTimeout(() => {
          try {
            this.recognition.start();
          } catch (error) {
            console.error("Failed to restart speech recognition:", error);
            this.isListening = false;
            this.onStatusChange(false);
            this.onError("Speech recognition stopped unexpectedly");
          }
        }, 300);
      } else {
        this.onStatusChange(false);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);

      // Handle specific error types
      let errorMessage = "Speech recognition error";

      switch (event.error) {
        case "network":
          errorMessage =
            "Network error. Please check your internet connection and try again.";
          // Stop listening immediately to prevent error loops
          this.isListening = false;
          this.recognition.stop();
          break;
        case "not-allowed":
        case "permission-denied":
          errorMessage =
            "Microphone access denied. Please allow microphone permissions in your browser settings.";
          this.isListening = false;
          break;
        case "aborted":
          // This is often triggered when the user manually stops, so we can be less alarming
          errorMessage = "Speech recognition was aborted";
          break;
        case "audio-capture":
          errorMessage =
            "No microphone detected. Please connect a microphone and try again.";
          this.isListening = false;
          break;
        case "service-not-allowed":
          errorMessage =
            "Speech recognition service is not allowed in this context";
          this.isListening = false;
          break;
        case "no-speech":
          errorMessage = "No speech detected. Please try speaking again.";
          // We can try to restart in this case
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
          this.isListening = false;
      }

      this.onError(errorMessage);
      this.onStatusChange(this.isListening);
    };
  }

  public async start() {
    if (!this.recognition) {
      this.onError("Speech recognition is not supported in this browser");
      return false;
    }

    // Check if we have microphone permission first
    if (navigator.mediaDevices) {
      try {
        // Request microphone permission explicitly before starting recognition
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Now try to start speech recognition
        if (!this.isListening) {
          try {
            this.recognition.start();
            this.isListening = true;
            this.onStatusChange(true);
            return true;
          } catch (error) {
            console.error("Error starting speech recognition:", error);
            this.onError(
              "Failed to start speech recognition. Please try again."
            );
            this.isListening = false;
            this.onStatusChange(false);
            return false;
          }
        }
        return true;
      } catch (error) {
        console.error("Microphone permission error:", error);
        this.onError(
          "Microphone access denied. Please allow microphone access and try again."
        );
        this.isListening = false;
        this.onStatusChange(false);
        return false;
      }
    } else {
      this.onError("Media devices not supported in this browser");
      return false;
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onStatusChange(false);
      return this.transcript;
    }
    return this.transcript;
  }

  public reset() {
    this.transcript = "";
    this.onTranscriptChange("");
  }

  public setOnTranscriptChange(callback: (transcript: string) => void) {
    this.onTranscriptChange = callback;
  }

  public setOnStatusChange(callback: (isListening: boolean) => void) {
    this.onStatusChange = callback;
  }

  public setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  public getTranscript() {
    return this.transcript;
  }

  public isSupported() {
    return !!this.recognition;
  }
}

// Singleton instance
let speechRecognitionInstance: SpeechRecognitionService | null = null;

export function getSpeechRecognition(): SpeechRecognitionService {
  if (!speechRecognitionInstance) {
    speechRecognitionInstance = new SpeechRecognitionService();
  }
  return speechRecognitionInstance;
}
