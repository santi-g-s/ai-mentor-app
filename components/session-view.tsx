"use client"

import { useState, useEffect } from "react"
import { AnimatedBlob } from "./animated-blob"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSpeechRecognition } from "@/lib/speech-recognition"
import { useToast } from "@/hooks/use-toast"

export function SessionView() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("")
  const [isSupported, setIsSupported] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  // Initialize speech recognition
  useEffect(() => {
    const speechRecognition = getSpeechRecognition()

    // Check if speech recognition is supported
    setIsSupported(speechRecognition.isSupported())

    // Set up event handlers
    speechRecognition.setOnTranscriptChange((text) => {
      setInterimTranscript(text)
    })

    speechRecognition.setOnStatusChange((status) => {
      setIsListening(status)
      // If listening stopped unexpectedly, also stop processing
      if (!status) {
        setIsProcessing(false)
      }
    })

    speechRecognition.setOnError((error) => {
      setIsProcessing(false)
      setHasError(true)
      toast({
        title: "Speech Recognition Error",
        description: error,
        variant: "destructive",
      })
    })

    // Clean up
    return () => {
      if (isListening) {
        speechRecognition.stop()
      }
    }
  }, [toast])

  const toggleListening = async () => {
    const speechRecognition = getSpeechRecognition()

    // Reset error state when trying again
    setHasError(false)

    if (!isListening) {
      // Start listening
      speechRecognition.reset()
      setTranscript("")
      setResponse("")

      try {
        // Show a loading state while we request permissions
        setIsProcessing(true)

        const started = await speechRecognition.start()

        setIsProcessing(false)

        if (!started) {
          setHasError(true)
          toast({
            title: "Could not start speech recognition",
            description: "Please check microphone permissions and try again",
            variant: "destructive",
          })
        }
      } catch (error) {
        setIsProcessing(false)
        setHasError(true)
        toast({
          title: "Speech Recognition Error",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        })
      }
    } else {
      // Stop listening and process the transcript
      const finalTranscript = speechRecognition.stop()
      setTranscript(finalTranscript)
      setInterimTranscript("")

      if (finalTranscript) {
        // Process the transcript
        setIsProcessing(true)

        // Simulate AI response - in a real app, you would send this to your AI service
        setTimeout(() => {
          setIsProcessing(false)
          setResponse(generateResponse(finalTranscript))
        }, 1500)
      }
    }
  }

  // Simple response generator - replace with actual AI integration
  const generateResponse = (text: string) => {
    if (text.toLowerCase().includes("overwhelm") || text.toLowerCase().includes("workload")) {
      return "Based on what you've shared about feeling overwhelmed, I recommend focusing on these key areas: time management, prioritization, and delegation. Would you like me to elaborate on any of these?"
    } else if (text.toLowerCase().includes("stress") || text.toLowerCase().includes("anxious")) {
      return "I hear that you're feeling stressed. Consider implementing mindfulness practices, regular breaks, and setting boundaries. Which of these would you like to explore first?"
    } else if (text.toLowerCase().includes("career") || text.toLowerCase().includes("job")) {
      return "Career development is important. Let's identify your strengths, areas for growth, and potential opportunities that align with your values. What aspect of your career would you like to focus on?"
    } else {
      return "Thank you for sharing. I've noted your thoughts. Is there a specific area where you'd like guidance or support?"
    }
  }

  return (
    <div className="flex flex-col items-center justify-between h-full py-8">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-center mb-2">AI Mentor</h1>
        <p className="text-muted-foreground text-center mb-8">Your personal guide for growth and development</p>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <AnimatedBlob
          isListening={isListening}
          onToggle={toggleListening}
          isSupported={isSupported}
          isProcessing={isProcessing}
          hasError={hasError}
        />
      </div>

      <div className="w-full space-y-4 mt-8">
        {interimTranscript && isListening && (
          <Card className="p-4 bg-secondary border-dashed">
            <p className="text-sm text-muted-foreground italic">{interimTranscript}</p>
          </Card>
        )}

        {transcript && !isListening && (
          <Card className="p-4 bg-secondary">
            <p className="text-sm">{transcript}</p>
          </Card>
        )}

        {response && (
          <Card className="p-4 bg-primary text-primary-foreground">
            <p className="text-sm">{response}</p>
          </Card>
        )}

        {(transcript || response) && !isListening && (
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTranscript("")
                setResponse("")
                setInterimTranscript("")
              }}
            >
              New Session
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // In a real app, this would save the session
                toast({
                  title: "Session Saved",
                  description: "Your session has been saved to your dashboard",
                })
                window.location.href = "/dashboard"
              }}
            >
              Save Session
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
