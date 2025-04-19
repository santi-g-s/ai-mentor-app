import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { input } = await request.json();

    console.log("DEBUG: Input", input);

    if (!input) {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }

    // Extract user messages from the input
    const userRegex = /<user>(.*?)<\/user>/gs;
    const userMessages = [];
    let match;

    while ((match = userRegex.exec(input)) !== null) {
      userMessages.push({
        role: "user",
        content: match[1].trim(),
      });
    }

    const backendResponse = await fetch(
      "http://127.0.0.1:8000/api/feature-extraction",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_messages: userMessages }),
      }
    );

    const backendData = await backendResponse.json();

    console.log(
      "DEBUG: Backend response from feature extraction",
      backendData.response
    );

    // Parse the string response into an actual array
    let tags = [];
    if (backendData.response && backendData.status === "success") {
      try {
        // Check if it's already a string that looks like an array
        if (
          typeof backendData.response === "string" &&
          backendData.response.trim().startsWith("[") &&
          backendData.response.trim().endsWith("]")
        ) {
          tags = JSON.parse(backendData.response);
        } else {
          // If it's just a comma-separated string
          tags = backendData.response.split(",").map((tag) => tag.trim());
        }
      } catch (error) {
        console.error("Error parsing tags:", error);
      }
    }

    return NextResponse.json({
      tags,
    });
  } catch (error) {
    console.error("Error generating tags:", error);
    return NextResponse.json(
      {
        error: "Failed to generate tags: " + (error.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
