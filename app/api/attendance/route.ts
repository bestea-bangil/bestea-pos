import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getJakartaYYYYMMDD } from "@/lib/date-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const employeeId = searchParams.get("employeeId");
    const checkStatus = searchParams.get("checkStatus"); // If true, return today's status for employee

    // Mode: Check Status for specific employee today
    if (checkStatus === "true" && employeeId) {
       const today = getJakartaYYYYMMDD();
       const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .maybeSingle();

       if (error) throw error;
       return NextResponse.json(data || null);
    }

    // Mode: Fetch All/Filtered Records
    let query = supabase
      .from("attendance_records")
      .select(`
        *,
        employees (
          name,
          role,
          branch_id
        ),
        branches (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (branchId && branchId !== "all") {
      query = query.eq("branch_id", branchId);
    }

    if (date) {
      query = query.eq("date", date);
    }

    if (employeeId) {
        query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match frontend expectations if needed
    const formattedData = data.map((record: any) => ({
        id: record.id,
        employeeId: record.employee_id,
        employeeName: record.employees?.name || "Unknown",
        role: record.employees?.role || "-",
        branchId: record.branch_id,
        branch: record.branches?.name || "Unknown",
        date: record.date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        status: record.status,
        shift: record.shift,
        notes: record.notes,
    }));

    return NextResponse.json(formattedData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, branchId, shift, status, notes, checkInTime, date } = body;

    // Validation
    if (!employeeId || !branchId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use provided date or derive from checkInTime or use current server date
    // Priority: date param -> checkInTime date -> current server date
    let recordDate = date;
    let finalCheckInTime = checkInTime;

    if (!finalCheckInTime) {
      finalCheckInTime = new Date().toISOString();
    }
    
    if (!recordDate) {
      // If checkInTime was provided, use its date. Otherwise use today.
      // We adjust for timezone if needed, but simple ISO split is usually safer for "server day"
      recordDate = getJakartaYYYYMMDD(finalCheckInTime ? new Date(finalCheckInTime) : undefined);
    }

    // Check if already OPEN session exists (not just for "today", but generally if they forgot to clock out)
    // Actually, usually we limit to "one per day" or "one open session". 
    // Let's stick to "one per day" to avoid blocking if they forgot to clock out yesterday (that should be auto-closed or handled).
    // But for "clock in reliability", checking strictly by date is fine for CREATION.

    const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", recordDate)
        .single();
    
    if (existing) {
        return NextResponse.json(
            { error: "Employee already has an attendance record for this date" },
             { status: 400 }
        );
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .insert([
        {
          employee_id: employeeId,
          branch_id: branchId,
          date: recordDate,
          check_in: finalCheckInTime,
          status: status || "Hadir",
          shift: shift || "Pagi", 
          notes: notes || "",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create attendance" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
     const body = await request.json();
     const { id, employeeId, action, notes, checkOutTime } = body; // action: 'clock_out' or 'update'

     if (!id && !employeeId) {
        return NextResponse.json({ error: "Missing ID or EmployeeID" }, { status: 400 });
     }

     if (action === "clock_out") {
         // Clock Out Logic
         const { status: bodyStatus } = body;
         
         // Find record if ID not provided
         let recordId = id;
         
         if (!recordId) {
             // Find LATEST OPEN session for this employee
             const { data: openRecord } = await supabase
                .from("attendance_records")
                .select("id")
                .eq("employee_id", employeeId)
                .is("check_out", null) // Look for open session
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!openRecord) {
                // Determine if we should fail or perhaps they are already clocked out?
                // For user feedback, it's better to say "No active shift found".
                return NextResponse.json({ error: "Tidak ada sesi absen aktif yang ditemukan." }, { status: 404 });
            }
            recordId = openRecord.id;
         }

         const updateData: any = {
             check_out: checkOutTime || new Date().toISOString(),
         };

         if (notes) updateData.notes = notes;
         if (bodyStatus) updateData.status = bodyStatus;

         const { data, error } = await supabase
            .from("attendance_records")
            .update(updateData)
            .eq("id", recordId)
            .select()
            .single();
        
         if (error) throw error;
         return NextResponse.json(data);

     } else {
         // Generic Update (Admin Edit)
         const { data, error } = await supabase
            .from("attendance_records")
            .update(body) 
            .eq("id", id)
            .select()
            .single();

         if (error) throw error;
         return NextResponse.json(data);
     }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete attendance" },
      { status: 500 }
    );
  }
}
