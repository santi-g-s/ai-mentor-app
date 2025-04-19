"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff } from "lucide-react";

export function SessionView() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState>("prompt");
  const [errorMessage, setErrorMessage] = useState("");

  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  // Initialize audio and check permissions
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create audio element for playback
      if (!audioElementRef.current) {
        const audioEl = new Audio();
        audioElementRef.current = audioEl;
      }

      // Check microphone permission status
      checkMicrophonePermission();
    }

    // Cleanup function
    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    };
  }, []);

  // Function to check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      // Check if the browser supports permissions API
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        setPermissionStatus(result.state);

        // Listen for changes to permission state
        result.onchange = () => {
          setPermissionStatus(result.state);
          if (result.state === "denied") {
            setErrorMessage(
              "Microphone access was denied. Please allow access in your browser settings."
            );
            toast({
              title: "Microphone access denied",
              description:
                "Please allow microphone access in your browser settings.",
              variant: "destructive",
            });
          } else if (result.state === "granted") {
            setErrorMessage("");
          }
        };
      }
    } catch (error) {
      console.log("Permission query not supported");
    }
  };

  // Request microphone permission explicitly
  const requestMicrophonePermission = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just want to request permission
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus("granted");
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setPermissionStatus("denied");
      setErrorMessage(
        "Microphone access was denied. Please allow access in your browser settings."
      );
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access in your browser settings.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Convert base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512);
      const byteNumbers = new Array(slice.length);

      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
  };

  // Start recording
  const startRecording = async () => {
    setErrorMessage("");

    // First request/check permissions
    if (permissionStatus !== "granted") {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        return;
      }
    }

    try {
      setTranscript("");
      setResponse("");
      setIsRecording(true);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder instance
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      setMediaRecorder(recorder);

      // Collect audio chunks
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // When recording stops, send to speech-to-text
      recorder.onstop = async () => {
        // Release microphone
        stream.getTracks().forEach((track) => track.stop());

        // Process audio data if we have any
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType,
          });
          await transcribeAudio(audioBlob);
        }
      };

      // Handle recorder errors
      recorder.onerror = (event) => {
        console.error("Recorder error:", event.error);
        setErrorMessage(
          `Recording error: ${event.error.message || event.error.name}`
        );
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        toast({
          title: "Recording Error",
          description: `Error: ${event.error.message || event.error.name}`,
          variant: "destructive",
        });
      };

      // Start recording
      recorder.start(1000); // Collect data in 1-second chunks
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setIsRecording(false);

      if (error.name === "NotAllowedError") {
        setErrorMessage(
          "Microphone access was denied. Please allow access in your browser settings."
        );
        setPermissionStatus("denied");
      } else if (error.name === "NotFoundError") {
        setErrorMessage(
          "No microphone found. Please connect a microphone and try again."
        );
      } else {
        setErrorMessage(`Error: ${error.message || error.name}`);
      }

      toast({
        title: "Recording Error",
        description: error.message || "Failed to start recording",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Send audio to speech-to-text API
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // Create a loading message
      setTranscript("Transcribing your audio...");

      // Convert Blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        try {
          // Extract base64 string (remove data URL prefix)
          const base64Audio = (reader.result as string).split(",")[1];

          // Send to our API endpoint
          const response = await fetch("/api/speech-to-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioContent: base64Audio,
              mimeType: audioBlob.type,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.transcript) {
            setTranscript(data.transcript);
            await processText(data.transcript);
          } else if (data.error) {
            setErrorMessage(`Transcription error: ${data.error}`);
            setTranscript(""); // Clear the "Transcribing..." message
            toast({
              title: "Transcription Error",
              description: data.error,
              variant: "destructive",
            });
          } else {
            setErrorMessage(
              "No speech detected. Please try again and speak clearly."
            );
            setTranscript(""); // Clear the "Transcribing..." message
            toast({
              title: "No Speech Detected",
              description: "Please try again and speak clearly.",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          console.error("Error in transcription process:", err);
          setErrorMessage(`Transcription failed: ${err.message}`);
          setTranscript(""); // Clear the "Transcribing..." message
          toast({
            title: "Transcription Failed",
            description: err.message,
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      setErrorMessage("Failed to transcribe audio. Please try again.");
      setTranscript(""); // Clear any "Transcribing..." message
      setIsProcessing(false);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Process transcript with AI
  const processText = async (text: string) => {
    if (!text) return;

    try {
      const response = await fetch("/api/process-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      const data = await response.json();
      setResponse(data.output);

      // Use TTS for the response
      await speakResponse(data.output);
    } catch (error: any) {
      console.error("Error processing text:", error);
      setResponse("An error occurred.");
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process text",
        variant: "destructive",
      });
    }
  };

  // Convert text to speech
  const speakResponse = async (text: string) => {
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.audioContent) {
        // Convert base64 to audio
        const audioBlob = base64ToBlob(data.audioContent, "audio/mp3");
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play the audio
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
          audioElementRef.current.play();
        }
      }
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      toast({
        title: "Text-to-Speech Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] overflow-hidden">
      {/* Main content area - empty as requested */}
      <div className="flex-1 overflow-auto">
        {errorMessage && (
          <div className="m-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-4">
        <div className="flex items-center gap-2 p-2 bg-primary rounded-full">
          <div className="flex-1 text-white px-4">
            {isRecording
              ? "Listening..."
              : isProcessing
              ? "Processing..."
              : "Tap to speak"}
          </div>
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            variant="ghost"
            className="rounded-full h-10 w-10 p-0 bg-white"
          >
            {isRecording ? (
              <MicOff className="h-5 w-5 text-red-500" />
            ) : (
              <Mic className="h-5 w-5 text-primary" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
