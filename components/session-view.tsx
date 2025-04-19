"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { MicrophoneBar } from "@/components/microphone-bar";

export function SessionView() {
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize audio element for playback
  useEffect(() => {
    if (typeof window !== "undefined" && !audioElementRef.current) {
      const audioEl = new Audio();
      audioElementRef.current = audioEl;
    }
  }, []);

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

  // Process transcript with AI
  const processText = async (text: string) => {
    if (!text) return;

    setTranscript(text);

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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] overflow-hidden">
      {/* Main content area - empty as requested */}
      <div className="flex-1 overflow-auto">
        {/* Display transcript and AI response here if needed */}
      </div>

      {/* Bottom microphone bar */}
      <MicrophoneBar onTranscriptReady={processText} />
    </div>
  );
}
