import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name");

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/branches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, type, email, address, phone } = body;

    const { data, error } = await supabase
      .from("branches")
      .insert({ name, type, email, address, phone })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
       return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("branches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("branches")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete branch" },
            { status: 500 }
        );
    }
}
