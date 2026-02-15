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
  parseISO,
  format,
} from "date-fns";
import { getJakartaYYYYMMDD } from "@/lib/date-utils";

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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startIso: string;
    let endIso: string;

    if (startDateParam && endDateParam) {
        // Assume params are YYYY-MM-DD
        startIso = `${startDateParam}T00:00:00+07:00`;
        endIso = `${endDateParam}T23:59:59.999+07:00`;
    } else {
        // Get Today in Jakarta (YYYY-MM-DD)
        const todayStr = getJakartaYYYYMMDD();
        const todayDate = parseISO(todayStr); // Local date object (00:00 system time)

        let startLocal: Date;
        let endLocal: Date;

        switch (period) {
          case "today":
            startLocal = startOfDay(todayDate);
            endLocal = endOfDay(todayDate);
            break;
          case "yesterday":
            const yesterday = subDays(todayDate, 1);
            startLocal = startOfDay(yesterday);
            endLocal = endOfDay(yesterday);
            break;
          case "this_week":
            startLocal = startOfWeek(todayDate, { weekStartsOn: 1 });
            endLocal = endOfWeek(todayDate, { weekStartsOn: 1 });
            break;
          case "this_month":
            startLocal = startOfMonth(todayDate);
            endLocal = endOfMonth(todayDate);
            break;
          case "this_year":
            startLocal = startOfYear(todayDate);
            endLocal = endOfYear(todayDate);
            break;
          default:
            startLocal = startOfDay(todayDate);
            endLocal = endOfDay(todayDate);
        }

        // Format back to YYYY-MM-DD string to ensure we drop any system timezone artifacts
        const startYMD = format(startLocal, "yyyy-MM-dd");
        const endYMD = format(endLocal, "yyyy-MM-dd");

        // Append Jakarta Offset explicitly
        startIso = `${startYMD}T00:00:00+07:00`;
        endIso = `${endYMD}T23:59:59.999+07:00`;
    }

    // Convert to UTC Date objects for Supabase Query
    const start = new Date(startIso);
    const end = new Date(endIso);

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
