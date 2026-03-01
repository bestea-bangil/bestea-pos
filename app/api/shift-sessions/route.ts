import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status"); // 'open' or 'closed'

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    let query = supabase
      .from("shift_sessions")
      .select(`
        *,
        opener:opened_by(id, name, role),
        closer:closed_by(id, name, role)
      `)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (status) {
        query = query.eq("status", status);
        // If looking for open shift, return single
        if (status === 'open') {
            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            return NextResponse.json(data);
        }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branchId, employeeId, initialCash } = body;
    const supabase = await createClient();

    // Check if there is already an open shift for this branch
    const { data: existing } = await supabase
        .from("shift_sessions")
        .select("id")
        .eq("branch_id", branchId)
        .eq("status", "open")
        .maybeSingle();
    
    if (existing) {
        return NextResponse.json({ error: "Shift already open for this branch" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shift_sessions")
      .insert([
        {
          branch_id: branchId,
          opened_by: employeeId,
          initial_cash: initialCash,
          start_time: new Date().toISOString(),
          status: "open"
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, employeeId, actualCash, expectedCash, notes } = body;
    const supabase = await createClient();

    const discrepancy = actualCash - expectedCash;

    const { data, error } = await supabase
      .from("shift_sessions")
      .update({
        closed_by: employeeId,
        actual_cash: actualCash,
        expected_cash: expectedCash,
        discrepancy: discrepancy,
        notes: notes,
        end_time: new Date().toISOString(),
        status: "closed"
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
