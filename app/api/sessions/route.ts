import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Create a new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          id: body.id,
          timestamp: body.timestamp || new Date().toISOString(),
          transcript: body.transcript || "",
          profile: body.profile,
          duration: body.duration || 0,
          status: body.status || "created",
          tags: body.tags || [],
          title: body.title || "Untitled Session",
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get all sessions
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
