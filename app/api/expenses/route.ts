import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, amount, description, branchId, recordedBy, date, shiftSessionId } = body;

    // Validate
    if (!category || !amount || !branchId) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          category,
          amount,
          description,
          branch_id: branchId,
          recorded_by: recordedBy,
          date: date || new Date().toISOString(),
          shift_session_id: shiftSessionId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function GET(request: Request) {
     // Optional: if we need to fetch expenses list separately
     // For now reports handles it.
     return NextResponse.json({ message: "Use /api/reports for fetching expenses" });
}
