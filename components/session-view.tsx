"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { MicrophoneBar } from "@/components/microphone-bar";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { v4 as uuidv4 } from "uuid";

// Add AudioContext type definition for cross-browser compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function SessionView() {
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState("Robin");
  const [sessionId, setSessionId] = useState<string>("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "created" | "active" | "complete"
  >("created");

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Complete session function
  const completeSession = async () => {
    // Stop any playing audio
    stopAudio();

    if (sessionId && startTime) {
      const endTime = new Date();
      const durationInSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            duration: durationInSeconds,
            transcript,
            status: "complete",
          }),
        });

        setSessionStatus("complete");
        toast({
          title: "Session completed",
          description: `Session duration: ${durationInSeconds} seconds`,
        });

        // Reset state and create a new session
        setTranscript("");
        setResponse("");
        setAmplitude(0);
        initSession();
      } catch (error) {
        console.error("Error completing session:", error);
        toast({
          title: "Error",
          description: "Failed to complete session",
          variant: "destructive",
        });
      }
    }
  };

  // Initialize a new session
  const initSession = async () => {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Create a new session in Supabase
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          timestamp,
          transcript: "",
          profile: selectedProfile,
          duration: 0,
          status: "created",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      setSessionId(id);
      setStartTime(new Date());
      setSessionStatus("created");
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  // Initialize session when component mounts
  useEffect(() => {
    initSession();

    // When component unmounts, update the session with final data
    return () => {
      if (sessionId && startTime && sessionStatus !== "complete") {
        const endTime = new Date();
        const durationInSeconds = Math.floor(
          (endTime.getTime() - startTime.getTime()) / 1000
        );

        // Save the session data when navigating away
        fetch(`/api/sessions/${sessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            duration: durationInSeconds,
            transcript,
            status: "complete",
          }),
        }).catch((error) => {
          console.error("Error updating session:", error);
        });
      }
    };
  }, []);

  // Update session when profile changes
  useEffect(() => {
    if (sessionId && selectedProfile) {
      fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: selectedProfile,
        }),
      }).catch((error) => {
        console.error("Error updating profile:", error);
      });
    }
  }, [sessionId, selectedProfile]);

  // Initialize audio element and Web Audio API for playback and analysis
  useEffect(() => {
    if (typeof window !== "undefined" && !audioElementRef.current) {
      console.log("DEBUG: Creating audio element and context");
      const audioEl = new Audio();
      audioEl.addEventListener("play", () => {
        console.log("DEBUG: Audio started playing");
        startVisualization();
      });
      audioEl.addEventListener("pause", () => {
        console.log("DEBUG: Audio paused");
        stopVisualization();
      });
      audioEl.addEventListener("ended", () => {
        console.log("DEBUG: Audio ended");
        stopVisualization();
      });
      audioElementRef.current = audioEl;

      // Create audio context and analyzer
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log(
          "DEBUG: AudioContext created",
          audioContextRef.current.state
        );

        if (audioContextRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          console.log(
            "DEBUG: Analyser created with fftSize",
            analyserRef.current.fftSize
          );
        }
      } catch (error) {
        console.error("DEBUG: Error creating audio context", error);
      }
    }

    return () => {
      console.log("DEBUG: Cleaning up audio resources");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioElementRef.current) {
        audioElementRef.current.removeEventListener("play", startVisualization);
        audioElementRef.current.removeEventListener("pause", stopVisualization);
        audioElementRef.current.removeEventListener("ended", stopVisualization);
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Start visualization when audio plays
  const startVisualization = () => {
    console.log("DEBUG: Starting visualization");
    if (
      !audioContextRef.current ||
      !audioElementRef.current ||
      !analyserRef.current
    ) {
      console.error("DEBUG: Missing required refs for visualization", {
        context: !!audioContextRef.current,
        audio: !!audioElementRef.current,
        analyser: !!analyserRef.current,
      });
      return;
    }

    // Connect audio to analyzer if not already connected
    try {
      if (!sourceNodeRef.current) {
        console.log("DEBUG: Creating source node from audio element");
        sourceNodeRef.current =
          audioContextRef.current.createMediaElementSource(
            audioElementRef.current
          );
        console.log("DEBUG: Connecting source node to analyzer");
        sourceNodeRef.current.connect(analyserRef.current);
        console.log("DEBUG: Connecting analyzer to destination");
        analyserRef.current.connect(audioContextRef.current.destination);
      } else {
        console.log("DEBUG: Source node already exists, not creating new one");
      }

      // Start animation loop
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      console.log("DEBUG: Created data array with size", dataArray.length);

      const updateAmplitude = () => {
        if (!analyserRef.current) {
          console.error("DEBUG: Analyzer not available for update");
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average amplitude from frequency data
        const average =
          dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const normalizedAmplitude = average / 256; // Normalize to 0-1 range

        if (normalizedAmplitude > 0.01) {
          console.log("DEBUG: Amplitude update", {
            average,
            normalizedAmplitude,
          });
        }

        setAmplitude(normalizedAmplitude);
        animationFrameRef.current = requestAnimationFrame(updateAmplitude);
      };

      updateAmplitude();
    } catch (error) {
      console.error("DEBUG: Error in visualization setup", error);
    }
  };

  // Stop visualization
  const stopVisualization = () => {
    console.log("DEBUG: Stopping visualization");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAmplitude(0);
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

  // Stop any playing audio
  const stopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
  };

  // Check if text is a simple greeting
  const isGreeting = (text: string): boolean => {
    const greetingPatterns = [
      /^hi\b/i,
      /^hello\b/i,
      /^hey\b/i,
      /^greetings/i,
      /^howdy\b/i,
      /^good morning\b/i,
      /^good afternoon\b/i,
      /^good evening\b/i,
      /^what's up\b/i,
      /^sup\b/i,
    ];

    // Clean the text (remove punctuation and extra spaces)
    const cleanText = text.trim().toLowerCase();

    // Check if the clean text matches any greeting pattern
    return greetingPatterns.some((pattern) => pattern.test(cleanText));
  };

  // Process transcript with AI
  const processText = async (text: string) => {
    if (!text) return;

    // Stop any playing audio when new input is received
    stopAudio();

    // If this is the first message, update status to active
    if (sessionStatus === "created") {
      setSessionStatus("active");

      // Update status in database
      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "active",
            }),
          });
        } catch (error) {
          console.error("Error updating session status:", error);
        }
      }
    }

    // Append user's message to transcript with proper formatting
    const updatedTranscript = transcript
      ? `${transcript}\n\n<user>${text}</user>`
      : `<user>${text}</user>`;

    setTranscript(updatedTranscript);

    // Update transcript in session (just the user part for now)
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript: updatedTranscript,
          }),
        });
      } catch (error) {
        console.error("Error updating transcript:", error);
      }
    }

    // Play a filler message while waiting for the main response
    const fillerPhrases = [
      "Hmm, let me think...",
      "Let me see.....",
      "hmmm, I see...",
    ];
    const randomFiller =
      fillerPhrases[Math.floor(Math.random() * fillerPhrases.length)];

    // Start speaking the filler phrase only if it's not a greeting
    let fillerPromise;
    if (!isGreeting(text)) {
      fillerPromise = speakResponse(randomFiller);
    }

    try {
      // Process the text in parallel with speaking the filler
      // Get the variant value from the selected profile
      let variantName = "variant_base"; // Default
      
      // Map selected profile to variant
      if (selectedProfile === "Kai") {
        variantName = "variant_comfort";
      } else if (selectedProfile === "Suki") {
        variantName = "variant_solutions";
      } else if (selectedProfile === "May") {
        variantName = "variant_inspiration";
      } else if (selectedProfile === "Tenzin") {
        variantName = "variant_tough";
      }
      
      const response = await fetch("/api/process-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, variantName }),
      });

      const data = await response.json();
      setResponse(data.output);

      // Append the assistant's response to the transcript
      const finalTranscript = `${updatedTranscript}\n\n<assistant>${data.output}</assistant>`;
      setTranscript(finalTranscript);

      // Update the session with the complete conversation
      if (sessionId) {
        try {
          await fetch(`/api/sessions/${sessionId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transcript: finalTranscript,
            }),
          });
        } catch (error) {
          console.error("Error updating transcript with response:", error);
        }
      }

      // Wait for filler audio to finish naturally if it's playing
      // if (fillerPromise && audioElementRef.current) {
      //   // Check if audio is still playing
      //   if (!audioElementRef.current.ended && !audioElementRef.current.paused) {
      //     console.log("DEBUG: Waiting for filler audio to finish naturally");

      //     // Create a promise that resolves when the audio ends
      //     await new Promise((resolve) => {
      //       const onEnded = () => {
      //         console.log("DEBUG: Filler audio finished naturally");
      //         audioElementRef.current?.removeEventListener("ended", onEnded);
      //         resolve(null);
      //       };

      //       audioElementRef.current?.addEventListener("ended", onEnded, {
      //         once: true,
      //       });

      //       // Add a safety timeout in case the audio doesn't trigger the ended event
      //       setTimeout(() => {
      //         console.log("DEBUG: Safety timeout for filler audio");
      //         audioElementRef.current?.removeEventListener("ended", onEnded);
      //         resolve(null);
      //       }, 5000); // 5 second safety timeout
      //     });
      //   } else {
      //     console.log("DEBUG: Filler audio already finished");
      //   }
      // }
      stopAudio();

      // Now play the actual response (no need to call stopAudio since we waited for it to finish)
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
    console.log("DEBUG: Starting text-to-speech process");
    try {
      // Get the variant value from the selected profile
      let variant = "variant_base"; // Default
      
      // Map selected profile to variant
      if (selectedProfile === "Kai") {
        variant = "variant_comfort";
      } else if (selectedProfile === "Suki") {
        variant = "variant_solutions";
      } else if (selectedProfile === "May") {
        variant = "variant_inspiration";
      } else if (selectedProfile === "Tenzin") {
        variant = "variant_tough";
      }
      
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, variant }),
      });

      const data = await response.json();
      console.log("DEBUG: Received TTS response", {
        hasAudioContent: !!data.audioContent,
      });

      if (data.audioContent) {
        // Convert base64 to audio
        const audioBlob = base64ToBlob(data.audioContent, "audio/mp3");
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("DEBUG: Created audio URL", audioUrl);

        // Play the audio
        if (audioElementRef.current) {
          console.log("DEBUG: Setting up audio element for playback");
          // Resume audio context if suspended (needed due to autoplay policy)
          if (audioContextRef.current?.state === "suspended") {
            console.log("DEBUG: Resuming suspended audio context");
            await audioContextRef.current.resume();
          }

          audioElementRef.current.src = audioUrl;
          console.log("DEBUG: Starting audio playback");
          await audioElementRef.current.play().catch((err) => {
            console.error("DEBUG: Error playing audio", err);
          });
        } else {
          console.error("DEBUG: Audio element not available for playback");
        }
      }
    } catch (error) {
      console.error("DEBUG: Error with text-to-speech:", error);
      toast({
        title: "Text-to-Speech Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] overflow-hidden">
      {/* DEBUG display */}

      {/* Main content area with audio visualizer */}
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <AudioVisualizer amplitude={amplitude} />
      </div>

      {sessionStatus === "created" && (
        <div className="px-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Robin card (full width) */}
            <div
              className={`col-span-2 rounded-lg p-3 cursor-pointer transition-all shadow-sm border border-gray-200 ${
                selectedProfile === "Robin" ? "bg-white" : "bg-bg-primary"
              }`}
              onClick={() => setSelectedProfile("Robin")}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">Robin</p>
                  <p className="text-xs text-gray-600">Standard mentor</p>
                </div>
              </div>
            </div>

            {/* Other profile cards (half width) */}
            {[
              { name: "Kai", description: "Comfort & Reassurance" },
              { name: "Suki", description: "Problem solving" },
              { name: "May", description: "Inspiration & Motivation" },
              { name: "Tenzin", description: "Tough love" },
            ].map((profile) => (
              <div
                key={profile.name}
                className={`rounded-lg p-3 cursor-pointer transition-all shadow-sm border border-gray-200 ${
                  selectedProfile === profile.name
                    ? "bg-white"
                    : "bg-bg-primary"
                }`}
                onClick={() => setSelectedProfile(profile.name)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{profile.name}</p>
                    <p className="text-xs text-gray-600">
                      {profile.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End session button (shown when session is active) */}
      {sessionStatus === "active" && (
        <div className="absolute top-4 right-4">
          <button
            onClick={completeSession}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition-colors"
          >
            End Session
          </button>
        </div>
      )}

      {/* Bottom microphone bar */}
      <MicrophoneBar
        onTranscriptReady={processText}
        onRecordingStart={stopAudio}
      />
    </div>
  );
}
