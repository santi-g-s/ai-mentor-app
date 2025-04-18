"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AnimatedBlobProps {
  isListening?: boolean
  onToggle?: () => void
  isSupported?: boolean
  isProcessing?: boolean
  hasError?: boolean
}

export function AnimatedBlob({
  isListening = false,
  onToggle,
  isSupported = true,
  isProcessing = false,
  hasError = false,
}: AnimatedBlobProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [pulseIntensity, setPulseIntensity] = useState(1)

  useEffect(() => {
    setIsAnimating(isListening)

    // Random pulse intensity for more natural animation when listening
    if (isListening) {
      const interval = setInterval(() => {
        setPulseIntensity(0.8 + Math.random() * 0.4)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isListening])

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={cn(
          "blob-container relative flex items-center justify-center",
          isSupported && !hasError ? "cursor-pointer" : "cursor-not-allowed opacity-60",
          isAnimating ? "opacity-100" : "opacity-80",
        )}
        onClick={isSupported && !hasError && !isProcessing ? onToggle : undefined}
        style={{
          // Apply dynamic pulse intensity when listening
          transform: isAnimating ? `scale(${pulseIntensity})` : "scale(1)",
          transition: "transform 1s ease-in-out",
        }}
      >
        <div className="z-10 bg-background rounded-full p-4">
          {!isSupported ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : hasError ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : isProcessing ? (
            <div className="h-8 w-8 flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : isAnimating ? (
            <Mic className="h-8 w-8 text-primary animate-pulse" />
          ) : (
            <MicOff className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {!isSupported
          ? "Speech recognition not supported in this browser"
          : hasError
            ? "There was an error with speech recognition"
            : isProcessing
              ? "Processing your message..."
              : isAnimating
                ? "Listening... Tap to stop"
                : "Tap to start speaking"}
      </p>

      {hasError && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onToggle}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  )
}
