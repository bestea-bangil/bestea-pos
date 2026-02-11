import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Get all active employees to check password
    // In a real app, we should probably pass the id or email too
    const { data: employees, error } = await supabase
      .from("employees")
      .select("*, branches (name)")
      .eq("status", "active");

    if (error || !employees) {
      return NextResponse.json({ error: "No active employees found" }, { status: 404 });
    }

    // Find employee with matching password hash
    let foundEmployee = null;
    
    for (const employee of employees) {
      if (!employee.password_hash) continue;
      
      try {
        const isMatch = bcrypt.compareSync(password, employee.password_hash);
        if (isMatch) {
          foundEmployee = employee;
          break;
        }
      } catch (e) {
        // Continue to check others
      }

      // Legacy SHA256 check
      const sha256Hash = require("crypto").createHash("sha256").update(password).digest("hex");
      if (sha256Hash === employee.password_hash) {
          foundEmployee = employee;
          break;
      }
    }
    
    // If not found by hash, check PIN column directly (for cashiers)
    if (!foundEmployee) {
        // Iterate again or we could have done it in the first loop if we selected pin
        // The previous select query was "*, branches...". So 'pin' should be there if it exists in schema.
        for (const employee of employees) {
            if (employee.pin && String(employee.pin) === String(password)) {
                foundEmployee = employee;
                break;
            }
        }
    }

    if (!foundEmployee) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Return employee data WITHOUT the password_hash
    const formatted = {
      id: foundEmployee.id,
      name: foundEmployee.name,
      email: foundEmployee.email,
      role:
        foundEmployee.role === "cashier"
          ? "Kasir"
          : foundEmployee.role === "branch_admin"
            ? "Admin Cabang"
            : "Super Admin",
      branch: foundEmployee.branches?.name || "",
      branchId: foundEmployee.branch_id,
      avatar_url: foundEmployee.avatar_url,
    };

    return NextResponse.json(formatted);

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
