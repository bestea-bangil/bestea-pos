import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Initialize Supabase Client with Service Role Key for secure access
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 }
      );
    }


    // 1. Find employee by email
    const { data: employeeData, error: empError } = await supabase
      .from("employees")
      .select("*, branches(*)")
      .eq("email", email)
      .eq("status", "active")
      .maybeSingle();

    if (!employeeData) {
      return NextResponse.json(
        { error: "Email atau password tidak valid" },
        { status: 401 }
      );
    }
    
    // 2. Verify password
    let isPasswordMatch = false;
    
    // Log the input for debug (masked)

    // A. Check legacy admin321 if no hash exists yet OR if it matches
    // This allows the user to login and set their first password
    if (password === "admin321" && employeeData.role === "super_admin") {
      isPasswordMatch = true;
    }

    // B. Check bcrypt hash
    if (!isPasswordMatch && employeeData.password_hash) {
      try {
        isPasswordMatch = bcrypt.compareSync(password, employeeData.password_hash);
      } catch (e) {
      }
    }

    // C. Fallback for SHA256 (optional, to help migration)
    if (!isPasswordMatch && employeeData.password_hash) {
       const sha256Hash = require("crypto").createHash("sha256").update(password).digest("hex");
       if (sha256Hash === employeeData.password_hash) {
          isPasswordMatch = true;
       }
    }

    // D. Check PIN (Plain text or simple string)
    // Primary auth method for Cashiers
    if (!isPasswordMatch && employeeData.pin) {
       // Convert both to string to be safe and trim
       const inputPin = String(password).trim();
       const storedPin = String(employeeData.pin).trim();
       
       
       if (inputPin === storedPin) {
          isPasswordMatch = true;
       }
    }

    if (isPasswordMatch) {
      return NextResponse.json({
        success: true,
        role: employeeData.role,
        employee: employeeData,
        branches: employeeData.branches
      });
    } else {
    }

    return NextResponse.json(
      { error: "Email atau password tidak valid" },
      { status: 401 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
