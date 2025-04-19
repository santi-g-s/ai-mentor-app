"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Send } from "lucide-react";

type MicrophoneBarProps = {
  onTranscriptReady: (transcript: string) => void;
};

export function MicrophoneBar({ onTranscriptReady }: MicrophoneBarProps) {
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState>("prompt");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentVolume, setCurrentVolume] = useState(0);

  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    checkMicrophonePermission();

    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }

      stopVolumeMonitoring();

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });

        setPermissionStatus(result.state);

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

  const requestMicrophonePermission = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const startVolumeMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const monitorVolume = () => {
        if (!analyserRef.current) {
          console.log("Analyser not available, stopping monitoring");
          return;
        }

        if (!isRecordingRef.current) {
          console.log("Not recording anymore (ref check), stopping monitoring");
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedValue = Math.min(
          70,
          Math.max(10, Math.round((average ** 1.2 / 255) * 70) + 10)
        );

        setCurrentVolume(normalizedValue);

        animationFrameRef.current = requestAnimationFrame(monitorVolume);
      };

      monitorVolume();
    } catch (error) {
      console.error("Error setting up audio analysis:", error);
    }
  };

  const stopVolumeMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCurrentVolume(0);
  };

  const startRecording = async () => {
    setErrorMessage("");

    if (permissionStatus !== "granted") {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        return;
      }
    }

    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setTimeout(() => {
        startVolumeMonitoring(stream);
      }, 100);

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      setMediaRecorder(recorder);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        stopVolumeMonitoring();

        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType,
          });
          await transcribeAudio(audioBlob);
        }
      };

      recorder.onerror = (event) => {
        isRecordingRef.current = false;
        stopVolumeMonitoring();

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

      recorder.start(1000);
      console.log("Recorder started");
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      isRecordingRef.current = false;

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

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(",")[1];

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
            onTranscriptReady(data.transcript);
          } else if (data.error) {
            setErrorMessage(`Transcription error: ${data.error}`);
            toast({
              title: "Transcription Error",
              description: data.error,
              variant: "destructive",
            });
          } else {
            setErrorMessage(
              "No speech detected. Please try again and speak clearly."
            );
            toast({
              title: "No Speech Detected",
              description: "Please try again and speak clearly.",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          console.error("Error in transcription process:", err);
          setErrorMessage(`Transcription failed: ${err.message}`);
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
      setIsProcessing(false);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getVolumeBarWidth = () => {
    return `${currentVolume}%`;
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
  };

  const handleTextInputSubmit = async () => {
    if (textInput.trim() === "") return;

    try {
      setIsProcessing(true);
      onTranscriptReady(textInput.trim());
      setTextInput("");
    } catch (error: any) {
      console.error("Error submitting text input:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit text",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextInputSubmit();
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="m-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {errorMessage}
        </div>
      )}
      <div className="p-4">
        {isRecording ? (
          <div
            onClick={stopRecording}
            className="h-14 bg-primary rounded-full overflow-hidden relative flex items-center justify-center cursor-pointer shadow-md"
          >
            <div
              className="h-10 bg-white rounded-full transition-all duration-30"
              style={{ width: getVolumeBarWidth() }}
            ></div>
          </div>
        ) : textInput ? (
          <div className="flex items-center h-14 pr-2 pl-6 bg-primary rounded-full shadow-md overflow-hidden">
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={handleTextInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 h-10 bg-transparent text-white outline-none"
              disabled={isProcessing}
            />
            <button
              onClick={handleTextInputSubmit}
              disabled={isProcessing || textInput.trim() === ""}
              className="h-10 w-10 rounded-full bg-white flex items-center justify-center"
            >
              <Send className="h-5 w-5 text-primary" />
            </button>
          </div>
        ) : (
          <div className="flex items-center h-14 bg-primary rounded-full shadow-md overflow-hidden">
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={handleTextInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type..."
              className="flex-1 h-full px-6 bg-transparent text-white outline-none placeholder:text-white/70"
              disabled={isProcessing}
            />
            <div className="px-2">
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="h-10 px-4 py-2 rounded-full bg-white text-primary font-medium flex items-center shadow-sm"
              >
                Speak <Mic className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
