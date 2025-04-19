import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }

    console.log("Input to process-text:", input);

    // Initialize the OpenAI client but configure for Goodfire
    // const openai = new OpenAI({
    //   apiKey: process.env.GOODFIRE_API_KEY,
    //   baseURL: "https://api.goodfire.ai/api/inference/v1", //
    // });

    // Generate response with streaming for lower latency
    let fullResponse = "Here is an example response";
    // const stream = await openai.chat.completions.create({
    //   model: "meta-llama/Llama-3.1-8B-Instruct", // Use Goodfire's model
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "You are a helpful assistant. Respond concisely and quickly.",
    //     },
    //     {
    //       role: "user",
    //       content: input,
    //     },
    //   ],
    //   stream: true,
    //   max_tokens: 100, // Lower token count for faster responses
    // });

    // for await (const chunk of stream) {
    //   fullResponse += chunk.choices[0].delta.content || "";
    // }

    return NextResponse.json({ output: fullResponse });
  } catch (error) {
    console.error("Error processing with Goodfire AI:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process text with AI: " +
          (error.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
