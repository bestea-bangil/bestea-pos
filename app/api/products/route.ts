import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const queryBranchId = searchParams.get("branch_id");
    const headerBranchId = request.headers.get("x-branch-id");
    const userRole = request.headers.get("x-user-role");

    let query = supabase
      .from("products")
      .select(`
        *,
        categories (name),
        product_variants (*)
      `)
      .order("name");

    // If branch_admin or cashier, restrict to their branch
    if (userRole !== "super_admin" && headerBranchId) {
      query = query.eq("branch_id", headerBranchId);
    } else if (queryBranchId) {
      // Super admin can filter by branch
      query = query.eq("branch_id", queryBranchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.categories?.name || "",
      categoryId: p.category_id,
      branchId: p.branch_id,
      price: p.price !== null ? Number(p.price) : null,
      trackStock: p.track_stock,
      stock: p.stock,
      image: p.image_url || "/placeholder-tea.jpg",
      status: p.status,
      variants: (p.product_variants || []).map((v: any) => ({
        name: v.name,
        price: Number(v.price)
      }))
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, categoryId, branchId, price, trackStock, stock, image, status, variants } = body;

    const userRole = request.headers.get("x-user-role");
    const headerBranchId = request.headers.get("x-branch-id");

    let effectiveBranchId = branchId;
    if (userRole !== "super_admin" && headerBranchId) {
      effectiveBranchId = headerBranchId;
    }

    // 2. Insert Product
    const { data: product, error } = await supabase
      .from("products")
      .insert([{
        name,
        category_id: categoryId,
        branch_id: effectiveBranchId,
        price,
        track_stock: trackStock,
        stock,
        image_url: image,
        status
      }])
      .select()
      .single();

    if (error) throw error;

    // 3. Insert Variants
    if (variants && variants.length > 0) {
        const variantsData = variants.map((v: any) => ({
            product_id: product.id,
            name: v.name,
            price: v.price
        }));
        const { error: variantError } = await supabase.from("product_variants").insert(variantsData);
        if (variantError) throw variantError;
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, name, categoryId, branchId, price, trackStock, stock, image, status, variants } = body;

        const userRole = request.headers.get("x-user-role");
        const headerBranchId = request.headers.get("x-branch-id");

        let effectiveBranchId = branchId;
        if (userRole !== "super_admin" && headerBranchId) {
            effectiveBranchId = headerBranchId;
        }

        // 2. Update Product
        const { error } = await supabase
            .from("products")
            .update({
                name,
                category_id: categoryId,
                branch_id: effectiveBranchId,
                price,
                track_stock: trackStock,
                stock,
                image_url: image,
                status
            })
            .eq("id", id);

        if (error) throw error;

        // 3. Update Variants (Replace strategy)
        await supabase.from("product_variants").delete().eq("product_id", id);
        
        if (variants && variants.length > 0) {
            const variantsData = variants.map((v: any) => ({
                product_id: id,
                name: v.name,
                price: v.price
            }));
            await supabase.from("product_variants").insert(variantsData);
        }



        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        
        if(!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;



        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
