import OpenAI from "openai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const { input, variantName = "variant_inspiration" } = await request.json();

    if (!input) {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }

    console.log("Input to process-text:", input);
    console.log("Using variant:", variantName);

    // Call the FastAPI backend process-text endpoint
    const backendResponse = await fetch("http://127.0.0.1:8000/api/process-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_text: input,
        variant: variantName,
      }),
    });
    const backendData = await backendResponse.json();
    console.log("Backend response:", backendData);

    // Check if backend request was successful
    if (backendData.status === "success" && backendData.response) {
      return NextResponse.json({ output: backendData.response });
    }

    return NextResponse.json({ error: "Failed to process text with AI" }, { status: 500 });
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
