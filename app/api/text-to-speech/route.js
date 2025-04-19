import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const { text } = await request.json();

    console.log("Text to speech:", text);

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Initialize Google client with credentials
    let client;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Read credentials from the file path in the environment variable
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const credentials = JSON.parse(
        fs.readFileSync(path.resolve(credentialsPath), "utf8")
      );

      client = new textToSpeech.TextToSpeechClient({
        credentials,
      });
    }

    // Construct the request
    const req = {
      input: { text: text },
      // Select the language and SSML voice gender
      voice: {
        languageCode: "en-US",
        ssmlGender: "FEMALE",
        name: "en-US-Neural2-F",
      },
      // Select the type of audio encoding
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.3,
      },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(req);

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
