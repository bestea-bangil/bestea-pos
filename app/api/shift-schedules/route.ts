import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


// Shift schedule types
interface ShiftSchedule {
  id?: string;
  employee_id: string;
  branch_id: string;
  week_start: string; // YYYY-MM-DD format (Monday)
  day_of_week: number; // 0=Monday, 6=Sunday
  shift_type: "Pagi" | "Sore" | "Office" | "Libur";
  start_time?: string; // HH:MM format
  end_time?: string;
}

// GET /api/shift-schedules?week_start=2026-02-03&branch_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("week_start");
    const branchId = searchParams.get("branch_id");
    const employeeId = searchParams.get("employee_id");

    let query = supabase
      .from("shift_schedules")
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          role
        )
      `)
      .order("day_of_week", { ascending: true });

    if (weekStart) {
      query = query.eq("week_start", weekStart);
    }
    if (branchId) {
      query = query.eq("branch_id", branchId);
    }
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }


    const { data, error } = await query;
    

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch shift schedules" },
      { status: 500 }
    );
  }
}

// POST /api/shift-schedules - Create or update shift schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, branch_id, week_start, day_of_week, shift_type, start_time, end_time } = body;

    if (!employee_id || !week_start || day_of_week === undefined) {
      return NextResponse.json(
        { error: "employee_id, week_start, and day_of_week are required" },
        { status: 400 }
      );
    }

    // Upsert - insert or update if exists
    const { data, error } = await supabase
      .from("shift_schedules")
      .upsert(
        {
          employee_id,
          branch_id,
          week_start,
          day_of_week,
          shift_type: shift_type || "Libur",
          start_time: shift_type === "Libur" ? null : start_time,
          end_time: shift_type === "Libur" ? null : end_time,
        },
        {
          onConflict: "employee_id,week_start,day_of_week",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save shift schedule" },
      { status: 500 }
    );
  }
}

// PUT /api/shift-schedules - Bulk update schedules for a week
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { schedules } = body; // Array of shift schedules

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "schedules array is required" },
        { status: 400 }
      );
    }

    // Process each schedule
    const results = [];
    for (const schedule of schedules) {
      const { employee_id, branch_id, week_start, day_of_week, shift_type, start_time, end_time } = schedule;

      const { data, error } = await supabase
        .from("shift_schedules")
        .upsert(
          {
            employee_id,
            branch_id,
            week_start,
            day_of_week,
            shift_type: shift_type || "Libur",
            start_time: shift_type === "Libur" ? null : start_time,
            end_time: shift_type === "Libur" ? null : end_time,
          },
          {
            onConflict: "employee_id,week_start,day_of_week",
          }
        )
        .select()
        .single();

      if (error) {
      } else {
        results.push(data);
      }
    }

    return NextResponse.json({ updated: results.length, data: results });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to bulk update shift schedules" },
      { status: 500 }
    );
  }
}

// DELETE /api/shift-schedules?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("shift_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete shift schedule" },
      { status: 500 }
    );
  }
}
