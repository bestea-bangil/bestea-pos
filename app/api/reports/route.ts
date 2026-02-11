import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  isWithinInterval,
  parseISO
} from "date-fns";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || "all";
    const period = searchParams.get("period") || "today"; // today, yesterday, etc.
    // Or support custom range
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const WIB_OFFSET = 7 * 60 * 60 * 1000;
    const now = new Date();
    const nowWIB = new Date(now.getTime() + WIB_OFFSET);

    let startLocal: Date, endLocal: Date;

    if (startDateParam && endDateParam) {
        startLocal = startOfDay(parseISO(startDateParam));
        endLocal = endOfDay(parseISO(endDateParam));
    } else {
        switch (period) {
          case "today":
            startLocal = startOfDay(nowWIB);
            endLocal = endOfDay(nowWIB);
            break;
          case "yesterday":
            const yesterdayWIB = subDays(nowWIB, 1);
            startLocal = startOfDay(yesterdayWIB);
            endLocal = endOfDay(yesterdayWIB);
            break;
          case "this_week":
            startLocal = startOfWeek(nowWIB, { weekStartsOn: 1 });
            endLocal = endOfWeek(nowWIB, { weekStartsOn: 1 });
            break;
          case "this_month":
            startLocal = startOfMonth(nowWIB);
            endLocal = endOfMonth(nowWIB);
            break;
          case "this_year":
            startLocal = startOfYear(nowWIB);
            endLocal = endOfYear(nowWIB);
            break;
          default:
            startLocal = startOfDay(nowWIB);
            endLocal = endOfDay(nowWIB);
        }
    }

    // Convert local WIB boundaries back to UTC ISO for database query
    const start = new Date(startLocal.getTime() - WIB_OFFSET);
    const end = new Date(endLocal.getTime() - WIB_OFFSET);

    // 1. Fetch Transactions
    let trxQuery = supabase
      .from("transactions")
      .select("*, transaction_items(*)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (branchId !== "all") {
      trxQuery = trxQuery.eq("branch_id", branchId);
    }

    const { data: transactions, error: trxError } = await trxQuery;
    if (trxError) throw trxError;

    // 2. Fetch Expenses
    let expQuery = supabase
      .from("expenses")
      .select("*, employee:recorded_by(name)")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false });

    if (branchId !== "all") {
        expQuery = expQuery.eq("branch_id", branchId);
    }

    const { data: expenses, error: expError } = await expQuery;
    if (expError) throw expError;

    // 3. Calculate Summary
    const totalOmzet = transactions?.reduce((acc, t) => (t.status === "completed" ? acc + t.total_amount : acc), 0) || 0;
    const totalExpenses = expenses?.reduce((acc, e) => acc + e.amount, 0) || 0;
    const totalProfit = totalOmzet - totalExpenses;
    const totalTransactions = transactions?.filter(t => t.status === "completed").length || 0;

    return NextResponse.json({
        period,
        start: start.toISOString(),
        end: end.toISOString(),
        summary: {
            omzet: totalOmzet,
            expenses: totalExpenses,
            profit: totalProfit,
            transactions: totalTransactions
        },
        transactions: transactions || [],
        expenses: expenses || []
    });

  } catch (error) {
    console.error("[API Reports] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
