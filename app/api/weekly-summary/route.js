import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    // Calculate date for one week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log(
      `Fetching sessions from ${oneWeekAgo.toISOString()} to ${new Date().toISOString()}`
    );

    // Query Supabase for completed sessions from the past week
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("status", "complete") // Only get completed sessions
      .gte("timestamp", oneWeekAgo.toISOString()) // Sessions from the past week
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Convert each session to JSON
    const jsonSessions = data.map((session) => {
      const jsonSession = JSON.stringify(session);
      return JSON.parse(jsonSession);
    });

    // If no sessions found, return empty response
    if (jsonSessions.length === 0) {
      return NextResponse.json(
        {
          data: [],
          count: 0,
          summary: "No sessions found for the past week.",
          period: {
            start: oneWeekAgo.toISOString(),
            end: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    let summary =
      "Summary generation skipped. To enable AI-powered summaries, add GOODFIRE_API_KEY to your environment.";

    // Only attempt to generate a summary if Goodfire API key is available
    if (process.env.GOODFIRE_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.GOODFIRE_API_KEY,
          baseURL: "https://api.goodfire.ai/api/inference/v1",
        });

        const summaryResponse = await generateWeeklySummary(
          jsonSessions,
          openai
        );

        // Handle the response safely - the model is returning plain text, not JSON
        try {
          // Try to parse as JSON first
          summary = summaryResponse;
        } catch (parseError) {
          // If not valid JSON, just use the raw text
          console.log("Error parsing summary response as JSON, using raw text");
          summary = summaryResponse;
        }

        console.log("Generated summary:", summary);
      } catch (err) {
        console.error("Error generating summary:", err.message);
        summary = "Error generating summary. Please try again later.";
      }
    } else {
      console.log(
        "GOODFIRE_API_KEY not found in environment. Skipping summary generation."
      );
    }

    // Process and return the data
    return NextResponse.json(
      {
        data: jsonSessions,
        count: jsonSessions.length,
        summary,
        period: {
          start: oneWeekAgo.toISOString(),
          end: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateWeeklySummary(sessions, openai) {
  try {
    // Extract ONLY the transcript content as plain text
    const transcriptsText = sessions.map((session) => {
      return {
        title: session.title,
        tags: session.tags,
      };
    });

    // Create a prompt for OpenAI
    const systemPrompt = `You are an AI assistant that creates concise weekly summaries of therapy/mentoring sessions. Your ONLY task is to generate a 2-3 sentence summary of all sessions from the past week.
  
  CRITICAL INSTRUCTIONS:
  1. Analyze all session transcripts as a whole.
  2. Create ONE brief 2-3 sentence summary addressing the user directly.
  3. Highlight common themes, progress made, and key insights across all sessions.
  4. Use a supportive, reflective tone.
  5. YOUR RESPONSE MUST BE EXACTLY IN THIS FORMAT - A VALID JSON OBJECT WITH NO ADDITIONAL TEXT:
  {"weekSummary": "Your 2-3 sentence summary here."}
  
  DO NOT include any explanations, introductions, or additional formatting. ONLY return the JSON object.`;

    // Make the API call to OpenAI
    const response = await openai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are my therapy/mentoring session transcripts from the past week. Please provide a 1-2 sentence summary of these sessions as a whole:\n\n${transcriptsText}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    const content = response.choices[0].message.content.trim();

    // Try to parse as JSON, with fallback handling
    try {
      const jsonResponse = JSON.parse(content);
      return jsonResponse.weekSummary || content;
    } catch (parseError) {
      console.log("Response is not valid JSON:", content);

      // Try to extract JSON if it's embedded in other text
      const jsonMatch = content.match(/\{[\s\S]*"weekSummary"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson.weekSummary;
        } catch (e) {
          // If extraction fails, return the original content
          return content;
        }
      }

      return content;
    }
  } catch (error) {
    console.error("Error generating summary with OpenAI:", error);
    throw error;
  }
}
