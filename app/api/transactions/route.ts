import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiftSessionId = searchParams.get("shiftSessionId");
  const branchId = searchParams.get("branchId");
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");

  try {
    const supabase = await createAdminClient();
    let query = supabase
      .from("transactions")
      .select(`
        *,
        transaction_items (
          product_id,
          product_name,
          variant_name,
          price,
          quantity
        ),
        branches (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (shiftSessionId) {
      query = query.eq("shift_session_id", shiftSessionId);
    } else if (branchId && branchId !== "all") {
      query = query.eq("branch_id", branchId);
    }

    // Apply Pagination
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase Transaction Fetch Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transaction, items } = body;

    // Generate a friendly ID for display/receipt (#001)
    // Generate a friendly ID for display/receipt (#001)
    // Get latest transaction for today to generate sequence
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const supabase = await createAdminClient();
    const { data: lastTrx } = await supabase
      .from("transactions")
      .select("transaction_code")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dailySequence = 1;
    if (lastTrx?.transaction_code) {
      // Extract number from "#001" -> 1
      const lastNum = parseInt(lastTrx.transaction_code.replace(/\D/g, ""));
      if (!isNaN(lastNum)) {
        dailySequence = lastNum + 1;
      }
    }

    const transactionCode = `#${dailySequence.toString().padStart(3, "0")}`;


    // 1. Prepare Data for RPC
    const transactionData = {
      branchId: transaction.branchId,
      cashierId: transaction.cashierId,
      cashierName: transaction.cashierName,
      customerName: transaction.customerName,
      totalAmount: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      amountPaid: transaction.amountPaid,
      changeAmount: transaction.changeAmount,
      status: transaction.status || "completed",
      shiftSessionId: transaction.shiftSessionId,
      transactionCode: transactionCode,
    };

    const itemsData = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    // 2. Call RPC
    const { data: trxData, error: rpcError } = await supabase.rpc(
      "process_transaction",
      {
        p_transaction: transactionData,
        p_items: itemsData,
      },
    );

    if (rpcError) {
      console.error("RPC Error Full Details:", JSON.stringify(rpcError, null, 2));
      return NextResponse.json(
        { error: "Failed to process transaction", details: rpcError, message: rpcError.message || rpcError.details },
        { status: 500 },
      );
    }

    // 3. Return Success
    // Map snake_case to camelCase (RPC returns raw JSON, but we built it with mixed case in SQL? 
    // Wait, the SQL returns jsonb_build_object with specific keys.
    // Let's check the SQL return: keys are id, date, transactionCode, status.
    // We need to construct the full response expected by the frontend.
    
    const formattedTransaction = {
      id: trxData.id,
      date: trxData.date,
      branchId: transaction.branchId,
      cashierId: transaction.cashierId,
      cashierName: transaction.cashierName,
      branchName: transaction.branchName, // Pass through
      customerName: transaction.customerName,
      totalAmount: transaction.totalAmount,
      paymentMethod: transaction.paymentMethod,
      amountPaid: transaction.amountPaid,
      changeAmount: transaction.changeAmount,
      status: trxData.status,
      shiftSessionId: transaction.shiftSessionId,
      transactionCode: trxData.transactionCode,
      items: items || [],
    };



    return NextResponse.json(formattedTransaction, { status: 200 });
  } catch (error) {
    console.error("Transaction Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 },
    );
  }
}
