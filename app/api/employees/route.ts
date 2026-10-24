import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        branches (name)
      `)
      .order("name");

    if (error) throw error;

    const formatted = data.map((e: any) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone || "",
      role:
        e.role === "cashier"
          ? "Kasir"
          : e.role === "branch_admin"
            ? "Admin Cabang"
            : e.role === "super_admin"
              ? "Super Admin"
              : e.role, // Fallback to raw role name
      branch: e.branches?.name || "",
      branchId: e.branch_id,
      status: e.status,
      joinDate: e.join_date,
      baseSalary: Number(e.base_salary),
      hourlyRate: Number(e.hourly_rate),
      deductionAmount: Number(e.deduction_amount || 0),
      pin: e.pin,
      avatar_url: e.avatar_url,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[API Employees] Error:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, email, phone, role, branch, status, baseSalary, hourlyRate, deductionAmount, pin } = body;

    // Map role to DB enum/string
    const roleMap: Record<string, string> = {
        "Kasir": "cashier",
        "Admin Cabang": "branch_admin",
        "Super Admin": "super_admin"
        // New roles will be stored as their actual names from the roles table
    };

    let branchId = body.branchId;
    if (!branchId && branch) {
       const { data: bData } = await supabase.from("branches").select("id").eq("name", branch).single();
       if(bData) branchId = bData.id;
    }

    const { data, error } = await supabase
      .from("employees")
      .insert([{
        name,
        email,
        phone,
        role: roleMap[role] || role, // Use map or raw role name (for new roles)
        branch_id: branchId,
        status,
        join_date: new Date().toISOString().split('T')[0], // Today
        base_salary: baseSalary,
        hourly_rate: hourlyRate,
        deduction_amount: deductionAmount || 0,
        pin: pin ? String(pin) : null
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error("[API Employees] Create Error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createAdminClient();
        const body = await request.json();
        const { id, name, email, phone, role, branch, status, baseSalary, hourlyRate, deductionAmount, pin } = body;

        const roleMap: Record<string, string> = {
            "Kasir": "cashier",
            "Admin Cabang": "branch_admin",
            "Super Admin": "super_admin"
        };
        
        let branchId = body.branchId;
        if (!branchId && branch) {
           const { data: bData } = await supabase.from("branches").select("id").eq("name", branch).single();
           if(bData) branchId = bData.id;
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = roleMap[role] || role;
        if (branchId !== undefined) updateData.branch_id = branchId;
        if (status !== undefined) updateData.status = status;
        if (baseSalary !== undefined) updateData.base_salary = baseSalary;
        if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate;
        if (deductionAmount !== undefined) updateData.deduction_amount = deductionAmount || 0;

        // Only update PIN if it's provided and not the placeholder
        if (pin && pin !== "****") {
            updateData.pin = String(pin);
        }

        const { error } = await supabase
            .from("employees")
            .update(updateData)
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[API Employees] Update Error:", error);
        return NextResponse.json({ error: error?.message || "Failed to update employee" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createAdminClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        
        if(!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (error) {
            // Foreign key violation (e.g. referenced in transactions, shift_sessions, expenses, shifts)
            if (error.code === "23503" || error.message?.toLowerCase().includes("foreign key")) {
                return NextResponse.json({ 
                    error: "Karyawan memiliki riwayat transaksi/shift sehingga tidak dapat dihapus permanen demi integritas laporan keuangan. Silakan nonaktifkan karyawan.",
                    code: "FOREIGN_KEY_VIOLATION",
                    details: error.details,
                }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
         console.error("[API Employees] Delete Error:", error);
         return NextResponse.json({ error: error?.message || "Failed to delete employee" }, { status: 500 });
    }
}
