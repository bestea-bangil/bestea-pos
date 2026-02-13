
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getJakartaDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/payroll
 * ... (existing code)
 */
export async function GET(request: NextRequest) {
  // ... (existing GET logic)
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // "01-2024"
    const branchId = searchParams.get("branch_id");

    if (!monthParam) {
      return NextResponse.json(
        { error: "Month parameter is required (MM-YYYY)" },
        { status: 400 }
      );
    }

    // Convert MM-YYYY to YYYY-MM for DB and date filtering
    const [mm, yyyy] = monthParam.split("-");
    const dbMonth = `${yyyy}-${mm}`; // "2024-01"

    // Calculate start and end date of the month for attendance query
    const startDate = `${yyyy}-${mm}-01`;
    // Get last day of month
    const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
    const endDate = `${yyyy}-${mm}-${lastDay}`;

    // 1. Fetch Employees (Role: cashier only)
    let empQuery = supabase.from("employees").select("*").eq("role", "cashier");
    if (branchId) {
      empQuery = empQuery.eq("branch_id", branchId);
    }
    const { data: employees, error: empError } = await empQuery;

    if (empError) throw empError;

    // 2. Fetch Existing Payroll Records
    const { data: existingPayrolls, error: payrollError } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("month", dbMonth);

    if (payrollError) throw payrollError;

    // 3. Fetch Attendance Records for the month
    // We need attendance to calculate hours for employees without payroll record
    const { data: attendance, error: attError } = await supabase
      .from("attendance_records")
      .select("employee_id, check_in, check_out, status")
      .gte("date", startDate)
      .lte("date", endDate);

    if (attError) throw attError;

    // 3.5 Fetch Shift Schedules (to determine Scheduled Days)
    const { data: schedules, error: schedError } = await supabase
        .from("shift_schedules")
        .select("*");
    
    if (schedError) {
        console.error("Error fetching schedules:", schedError);
        // Don't throw, just continue with empty schedules (will result in 0 absences)
    }

    // 4. Merge Data
    // 4. Merge Data
    const payrollData = employees.map((emp) => {
      // --- LIVE CALCULATION (Draft/Fallback) ---
      const empAttendance = attendance?.filter((a) => a.employee_id === emp.id) || [];
      const attendanceCount = empAttendance.length;
      
      const empSchedules = schedules?.filter((s: any) => s.employee_id === emp.id) || [];
      
      let scheduledCount = 0;
      const daysInMonth = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
      
      const now = getJakartaDate();
      let checkUntilDay = daysInMonth;
      if (now.getFullYear() === parseInt(yyyy) && now.getMonth() + 1 === parseInt(mm)) {
        // Exclude today from "potential absence" check. 
        // Only count up to yesterday to allow today's attendance to happen.
        checkUntilDay = Math.max(0, now.getDate() - 1); 
      } else if (new Date(parseInt(yyyy), parseInt(mm) - 1, 1) > now) {
         checkUntilDay = 0;
      }

      for (let day = 1; day <= checkUntilDay; day++) {
        const date = new Date(parseInt(yyyy), parseInt(mm) - 1, day);
        if (emp.join_date) {
            const joinDate = new Date(emp.join_date);
            const dateStr = date.toISOString().split('T')[0];
            const joinDateStr = joinDate.toISOString().split('T')[0];
            if (dateStr < joinDateStr) continue;
        }

        let dayOfWeek = date.getDay() - 1; 
        if (dayOfWeek === -1) dayOfWeek = 6; 

        // Calculate Monday date for this specific date to match week_start
        const currentDay = date.getDay(); // 0 (Sun) - 6 (Sat)
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const mondayDate = new Date(date);
        mondayDate.setDate(date.getDate() + diffToMonday);
        
        // Format to YYYY-MM-DD
        // Use local time for date string generation to match what's stored in DB (assuming DB stores YYYY-MM-DD string)
        // We use the same method as in the frontend/shift page usually, but here simple ISO split is risky with timezones.
        // However, mondayDate is created from 'date' which is created from (yyyy, mm-1, day).
        // Let's use a safe formatter.
        const offset = mondayDate.getTimezoneOffset();
        const localMonday = new Date(mondayDate.getTime() - offset * 60 * 1000);
        const weekStartStr = localMonday.toISOString().split('T')[0];

        // Find specific schedule for this week and day
        const hasSchedule = empSchedules.some((s: any) => 
            s.week_start === weekStartStr && 
            s.day_of_week === dayOfWeek &&
            s.shift_type !== 'Libur'
        );

        if (hasSchedule) {
            scheduledCount++;
        }
      }

      let daysPresent = 0;
      let daysExcused = 0;
      let daysAlphaRecord = 0;

      empAttendance.forEach(att => {
        const s = att.status?.toLowerCase() || "";
        if (s === "hadir" || s.includes("present") || s === "terlambat" || s.includes("late")) {
            if (s.includes("pulang awal") || s.includes("early out")) {
                daysExcused++;
            } else {
                daysPresent++;
            }
        } else if (s === "sakit" || s.includes("sick") || s === "izin" || s.includes("leave")) {
            daysExcused++;
        } else if (s === "alpha" || s === "alpa" || s.includes("absent")) {
            daysAlphaRecord++;
        } else {
            daysPresent++;
        }
      });
      
      const totalRecorded = daysPresent + daysExcused + daysAlphaRecord;
      const daysAlphaSystem = Math.max(0, scheduledCount - totalRecorded);
      const totalAlpha = daysAlphaSystem + daysAlphaRecord;

      const baseSalary = Number(emp.base_salary) || 0;
      const deductionAmount = Number(emp.deduction_amount) || 0;
      const totalDeduction = (totalAlpha * deductionAmount) + (daysExcused * (deductionAmount * 0.5));
      const totalSalary = Math.max(0, baseSalary - totalDeduction);

      // --- CHECK FOR EXISTING RECORD ---
      const record = existingPayrolls?.find((p) => p.employee_id === emp.id);

      if (record) {
        return {
          id: record.id,
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          month: monthParam,
          hoursWorked: Number(record.hours_worked),
          baseSalary: Number(record.base_salary),
          hourlyRate: Number(record.hourly_rate),
          totalSalary: Number(record.total_salary),
          status: record.status,
          paidAt: record.paid_at,
          isDraft: false,
          // Snapshot fallback: use stored values if available, otherwise use live calculation
          attendanceDays: record.attendance_days || daysPresent,
          excusedDays: record.excused_days || daysExcused,
          alphaDays: record.alpha_days || totalAlpha,
          scheduledDays: record.scheduled_days || scheduledCount,
          totalDeduction: Number(record.deductions) || totalDeduction,
        };
      }

      // --- RETURN DRAFT ---
      return {
        id: `draft-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        month: monthParam,
        hoursWorked: daysPresent, 
        baseSalary: baseSalary,
        hourlyRate: deductionAmount, 
        totalSalary: Math.round(totalSalary), 
        status: "Draft",
        paidAt: null,
        isDraft: true,
        attendanceDays: daysPresent,
        excusedDays: daysExcused,
        alphaDays: totalAlpha,
        scheduledDays: scheduledCount,
        deductionAmount: deductionAmount, 
        totalDeduction: totalDeduction
      };
    });

    return NextResponse.json(payrollData);

  } catch (error: any) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll
 * ... (existing POST logic)
 */
export async function POST(request: NextRequest) {
   // ... (existing POST content - I will copy it to ensure I don't break it)
   try {
    const body = await request.json();
    const { 
      employeeId, 
      month, // "MM-YYYY"
      hoursWorked, 
      baseSalary,
      hourlyRate,
      totalSalary, 
      status,
      // Snapshot fields:
      attendanceDays,
      excusedDays,
      alphaDays,
      scheduledDays,
      totalDeduction
    } = body;

    // Convert "MM-YYYY" to "YYYY-MM"
    const [mm, yyyy] = month.split("-");
    const dbMonth = `${yyyy}-${mm}`;

    // Check if record exists
    const { data: existing } = await supabase
      .from("payroll_records")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("month", dbMonth)
      .single();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from("payroll_records")
        .update({
          hours_worked: hoursWorked,
          base_salary: baseSalary,
          hourly_rate: hourlyRate,
          total_salary: totalSalary,
          status: status, // "Paid" or "Pending"
          updated_at: new Date().toISOString(),
          ...(status === 'Paid' ? { paid_at: new Date().toISOString() } : {}),
          // Update snapshots
          attendance_days: attendanceDays,
          excused_days: excusedDays,
          alpha_days: alphaDays,
          scheduled_days: scheduledDays,
          deductions: totalDeduction
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from("payroll_records")
        .insert({
          employee_id: employeeId,
          month: dbMonth,
          hours_worked: hoursWorked,
          base_salary: baseSalary,
          hourly_rate: hourlyRate,
          total_salary: totalSalary,
          status: status,
          ...(status === 'Paid' ? { paid_at: new Date().toISOString() } : {}),
          // Store snapshots
          attendance_days: attendanceDays,
          excused_days: excusedDays,
          alpha_days: alphaDays,
          scheduled_days: scheduledDays,
          deductions: totalDeduction
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error saving payroll:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payroll
 * Query Params: id (optional), employee_id, month
 * Deletes a payroll record (reset to draft).
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const employeeId = searchParams.get("employee_id");
    const month = searchParams.get("month");

    let query = supabase.from("payroll_records").delete();

    if (id && !id.startsWith("draft-")) {
      query = query.eq("id", id);
    } else if (employeeId && month) {
      const [mm, yyyy] = month.split("-");
      const dbMonth = `${yyyy}-${mm}`;
      query = query.eq("employee_id", employeeId).eq("month", dbMonth);
    } else {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting payroll:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
