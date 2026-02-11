"use client";

import { useTransactions } from "@/app/context/transaction-context";
import { useBranch } from "@/contexts/branch-context";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import router from "next/router";
import { StatsCards } from "./components/stats-cards";
import { ChartAreaInteractive } from "./components/chart-area-interactive";
import { RecentSales } from "./components/recent-sales";
import { TopProducts } from "./components/top-products";
import { CategoryBreakdown } from "./components/category-breakdown";

// ... inside the component ...

interface DashboardData {
  revenue: number;
  revenueGrowth: number;
  transactionCount: number;
  transactionGrowth: number;
  expenses: number;
  profit: number;
  activeBranches: number;
  productsSold: number;
  productGrowth: number;
  topProducts: { name: string; sold: number; revenue: number }[];
  recentSales: {
    id: string;
    totalAmount: number;
    paymentMethod: string;
    transactionCode: string;
    items: { productName: string }[];
  }[];
  branchPerformance: {
    branch: string;
    revenue: number;
    percentage: number;
  }[];
  chartData: { date: string; tunai: number; qris: number }[];
  period: string;
  branchId: string | null;
}

export default function DashboardPage() {
  const { userRole, isCashier, isSuperAdmin, currentBranch } = useBranch();
  const { transactions } = useTransactions(); // Get transactions from context
  const pathname = usePathname();
  // Dashboard State
  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect kasir ke halaman POS
  useEffect(() => {
    if (isCashier) {
      router.push("/kasir");
    }
  }, [isCashier, router]);

  // Fetch Dashboard Data
  useEffect(() => {
    if (isCashier) return;

    const fetchStats = async () => {
      // Don't set loading on re-fetch (to avoid flashing)
      if (!data) setIsLoading(true);

      try {
        const query = new URLSearchParams({ period });
        // Super admin sees all branches — don't filter by HQ branch
        if (currentBranch?.id && !isSuperAdmin)
          query.append("branchId", currentBranch.id);

        const res = await fetch(`/api/dashboard/stats?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch stats");

        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [currentBranch, isCashier, isSuperAdmin, period, pathname, transactions]); // Added transactions as dependency

  // Jangan render dashboard content untuk kasir saat redirecting
  if (isCashier) {
    return null;
  }

  // Period Options
  const periodOptions = [
    { value: "today", label: "Hari Ini" },
    { value: "yesterday", label: "Kemarin" },
    { value: "this_week", label: "Minggu Ini" },
    { value: "this_month", label: "Bulan Ini" },
    { value: "this_year", label: "Tahun Ini" },
    { value: "30d", label: "30 Hari Terakhir" },
  ];

  if (isLoading && !data) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 md:gap-4">
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <a
              target="_blank"
              href="/kasir"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              Ke Kasir
            </a>
          )}
          {/* <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select> */}
        </div>
      </div>

      {/* Top Stats Cards */}
      {data && <StatsCards stats={data} period={period} />}

      {/* Chart and Recent Transactions */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ChartAreaInteractive />
        </div>
        {data && <RecentSales sales={data.recentSales} />}
      </div>

      {/* Top Products and Category Breakdown */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          {data && <TopProducts products={data.topProducts} />}
        </div>
        {data && (
          <CategoryBreakdown branchPerformance={data.branchPerformance} />
        )}
      </div>
    </div>
  );
}
