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
    const { category, amount, description, branchId, recordedBy, recordedByName, date, shiftSessionId } = body;

    // Validate
    if (!category || !amount || !branchId) {
       console.error("Expense Sync Missing Fields:", { category, amount, branchId });
       return NextResponse.json({ error: "Missing required fields (category, amount, branchId)" }, { status: 400 });
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
          recorded_by_name: recordedByName,
          created_at: date || new Date().toISOString(), // Use created_at instead of date
          shift_session_id: shiftSessionId,
        },
      ])
      .select()
      .single();

    if (error) {
       console.error("Supabase Expense Insert Error:", error);
       throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create expense", details: error }, { status: 500 });
  }
}

export async function GET(request: Request) {
     // Optional: if we need to fetch expenses list separately
     // For now reports handles it.
     return NextResponse.json({ message: "Use /api/reports for fetching expenses" });
}
