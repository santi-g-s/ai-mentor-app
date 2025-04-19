import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.GOODFIRE_API_KEY,
  baseURL: "https://api.goodfire.ai/api/inference/v1", //
});

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    const stream = await openai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct", // Use Goodfire's model
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates short, descriptive titles for conversation transcripts. Create a concise title (3-4 words maximum) that captures the essence of the conversation. The title should be engaging but not overly clever. Focus on the main topic or theme discussed.",
        },
        {
          role: "user",
          content: input,
        },
      ],
      stream: true,
      max_tokens: 25, // Lower token count for shorter titles
    });

    // Process the stream to get the title
    let title = "";
    for await (const chunk of stream) {
      title += chunk.choices[0]?.delta?.content || "";
    }

    // Clean up the title (remove quotes, extra spaces, etc.)
    title = title.trim().replace(/^["'](.*)["']$/, "$1");

    return NextResponse.json({ title });
  } catch (error: any) {
    console.error("Error generating title:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate title" },
      { status: 500 }
    );
  }
}
