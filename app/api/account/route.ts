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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, phone, avatar_url, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (avatar_url) updateData.avatar_url = avatar_url;
    
    // Hash password if provided using bcrypt
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      updateData.password_hash = bcrypt.hashSync(password, salt);
    }

    const { data, error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
       console.error("[API Account] DB Error:", error);
       throw error;
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error("[API Account] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update account" }, { status: 500 });
  }
}
