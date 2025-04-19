import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";

// Initialize client outside request handler (only runs once when module loads)
let ttsClient;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credentials = JSON.parse(
      fs.readFileSync(path.resolve(credentialsPath), "utf8")
    );
    ttsClient = new textToSpeech.TextToSpeechClient({ credentials });
  }
} catch (error) {
  console.error("Error initializing Text-to-Speech client:", error);
}

export async function POST(request) {
  try {
    const { text, variant } = await request.json();

    console.log("Text to speech:", text, "Variant:", variant);

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Default voice configuration
    let voice = {
      languageCode: "en-US",
      ssmlGender: "FEMALE",
      name: "en-US-Chirp3-HD-Aoede",
    };

    // Adjust voice based on variant if provided
    if (variant) {
      console.log(`Using variant: ${variant}`);

      // Select voice based on specific variant values
      switch (variant) {
        case "variant_base":
          voice.name = "en-US-Chirp3-HD-Aoede";
          break;
        case "variant_comfort":
          voice.name = "en-US-Chirp3-HD-Leda";
          break;
        case "variant_solutions":
          voice.name = "en-US-Chirp3-HD-Orus";
          break;
        case "variant_inspiration":
          voice.name = "en-US-Chirp3-HD-Kore";
          break;
        case "variant_tough":
          voice.name = "en-US-Chirp3-HD-Charon";
          break;
        default:
          // If variant includes custom voice specification
          if (variant.includes("voice=")) {
            voice.name = variant.split("voice=")[1];
          }
          break;
      }
    }

    // Construct the request
    const req = {
      input: { text: text },
      // Use the potentially modified voice configuration
      voice: voice,
      // Select the type of audio encoding
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.1,
      },
    };

    // Performs the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(req);

    // The response's audioContent is binary data that represents the
    // content of the audio file. Convert it to base64 for transmission
    const audioContent = response.audioContent.toString("base64");

    return NextResponse.json({ audioContent });
  } catch (error) {
    console.error("Error in Text-to-Speech API:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
