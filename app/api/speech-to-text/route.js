import { NextResponse } from "next/server";
import speech from "@google-cloud/speech";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const { audioContent, mimeType } = await request.json();

    if (!audioContent) {
      return NextResponse.json(
        { error: "Audio content is required" },
        { status: 400 }
      );
    }

    // Initialize Google client with credentials
    let client;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Read credentials from the file path in the environment variable
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const credentials = JSON.parse(
        fs.readFileSync(path.resolve(credentialsPath), "utf8")
      );

      client = new speech.SpeechClient({
        credentials,
      });
    }

    const audio = {
      content: audioContent,
    };

    // Determine encoding based on mime type
    let encoding = "WEBM_OPUS";
    let sampleRateHertz = 48000;

    if (mimeType) {
      console.log("Received mime type:", mimeType);
      // Handle different audio formats
      if (mimeType.includes("webm")) {
        encoding = "WEBM_OPUS";
        sampleRateHertz = 48000;
      } else if (mimeType.includes("wav")) {
        encoding = "LINEAR16";
        sampleRateHertz = 16000;
      } else if (mimeType.includes("ogg")) {
        encoding = "OGG_OPUS";
        sampleRateHertz = 48000;
      }
    }

    const config = {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: "en-US",
      model: "latest_short",
      useEnhanced: true,
    };

    console.log("Using config:", { encoding, sampleRateHertz });

    const speechRequest = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    const [response] = await client.recognize(speechRequest);

    // Check if we got any valid results
    if (!response.results || response.results.length === 0) {
      console.log("No speech detected in the audio");
      return NextResponse.json({
        transcript: "",
        error:
          "No speech detected. Please try speaking more clearly or check your microphone.",
      });
    }

    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    return NextResponse.json({ transcript: transcription });
  } catch (error) {
    console.error("Error in Speech-to-Text API:", error);
    return NextResponse.json(
      {
        error:
          "Failed to transcribe audio: " + (error.message || error.toString()),
      },
      { status: 500 }
    );
  }
}
