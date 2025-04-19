import OpenAI from "openai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const { input, variantName = "tough" } = await request.json();

    if (!input) {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }

    console.log("Input to process-text:", input);
    console.log("Using variant:", variantName);

    // Load the variant JSON file
    const variantPath = path.join(
      process.cwd(),
      "variants",
      `variant_${variantName}.json`
    );
    console.log(variantPath);

    if (!fs.existsSync(variantPath)) {
      return NextResponse.json(
        { error: `Variant '${variantName}' not found` },
        { status: 400 }
      );
    }

    const variantData = JSON.parse(fs.readFileSync(variantPath, "utf8"));
    console.log(variantData);

    // Initialize the OpenAI client but configure for Goodfire
    const openai = new OpenAI({
      apiKey: process.env.GOODFIRE_API_KEY,
      baseURL: "https://api.goodfire.ai/api/inference/v1",
    });

    // Generate response with streaming for lower latency
    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: variantData.base_model,
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
      stream: true,
      max_tokens: 1000, // Lower token count for faster responses
      variant: variantData, // Pass the variant data directly in the request
    });

    for await (const chunk of stream) {
      fullResponse += chunk.choices[0].delta.content || "";
    }

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
