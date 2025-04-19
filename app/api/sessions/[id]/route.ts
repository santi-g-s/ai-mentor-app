import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Update a session
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Need to explicitly await the params in Next.js App Router
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const body = await req.json();

    const { data, error } = await supabase
      .from("sessions")
      .update({
        transcript: body.transcript,
        duration: body.duration,
        // Only update other fields if they are provided
        ...(body.profile && { profile: body.profile }),
        ...(body.timestamp && { timestamp: body.timestamp }),
        ...(body.status && { status: body.status }),
        ...(body.tags && { tags: body.tags }),
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get a specific session
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Need to explicitly await the params in Next.js App Router
    const params = await Promise.resolve(context.params);
    const id = params.id;

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete a session
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Need to explicitly await the params in Next.js App Router
    const params = await Promise.resolve(context.params);
    const id = params.id;

    const { error } = await supabase.from("sessions").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Session deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
