import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Try to check if we have access (this will fail if RLS blocks us)
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .limit(1);

    if (error) {
      // If we get an error, return instructions to add a policy
      return NextResponse.json(
        {
          message:
            "Access to sessions table is blocked by Row Level Security. To fix this, run this SQL in your Supabase dashboard:",
          sql: `CREATE POLICY "allow_all_operations" ON sessions FOR ALL USING (true);`,
          error: error.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Access to Supabase sessions table is working correctly",
        data: data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
