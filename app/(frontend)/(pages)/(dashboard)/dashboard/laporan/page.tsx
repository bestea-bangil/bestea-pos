"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Download, Plus, Loader2 } from "lucide-react";
import { AddExpenseModal } from "./components/add-expense-modal";
import { ReportSummary } from "./components/report-summary";
import { ExpensesTable } from "./components/expenses-table";
import { TopProducts } from "./components/top-products";
import { useBranch } from "@/contexts/branch-context";

// Helper to format date if needed, or rely on API period
// We pass period to API.

export default function LaporanPage() {
  const pathname = usePathname();
  const { branches, isCashier } = useBranch();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    transactions: any[];
    expenses: any[];
    summary: {
      omzet: number;
      expenses: number;
      profit: number;
      transactions: number;
    };
  } | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        period: dateRange,
        branchId: selectedBranch,
      });

      const res = await fetch(`/api/reports?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedBranch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, pathname]);

  const handleAddExpense = async (expenseData: {
    category: string;
    amount: number;
    description: string;
    branchId: string;
    branchName: string;
  }) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseData,
          recordedBy: "Admin", // TODO: Get from auth context
          date: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to add expense");

      // Refresh data
      fetchReports();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Gagal menyimpan pengeluaran");
    }
  };

  // Map expenses for table
  const tableExpenses = useMemo(() => {
    if (!data?.expenses) return [];
    return data.expenses.map((e) => ({
      id: e.id,
      date: new Date(e.date || e.created_at).toLocaleDateString("id-ID"),
      category: e.category,
      note: e.description,
      amount: e.amount,
      branch:
        e.branchName ||
        branches.find((b) => b.id === e.branch_id)?.name ||
        "Unknown",
      employeeName:
        e.employee?.name || e.recorded_by_name || e.recorded_by || "-",
    }));
  }, [data?.expenses, branches]);

  // Top Products Calculation (Client-side from transactions)
  const calculatedTopProducts = useMemo(() => {
    if (!data?.transactions) return [];

    const productStats: Record<
      string,
      { name: string; sold: number; revenue: number }
    > = {};

    data.transactions.forEach((t) => {
      if (t.status === "completed" && t.transaction_items) {
        t.transaction_items.forEach((item: any) => {
          const pid = item.product_id || item.product_name; // Fallback
          if (!productStats[pid]) {
            productStats[pid] = {
              name: item.product_name,
              sold: 0,
              revenue: 0,
            };
          }
          productStats[pid].sold += item.quantity;
          productStats[pid].revenue += item.subtotal;
        });
      }
    });

    return Object.values(productStats)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((p, i) => ({
        id: `tp-${i}`,
        name: p.name,
        category: "Menu",
        sold: p.sold,
        revenue: p.revenue,
      }));
  }, [data?.transactions]);

  // Export handler
  const handleExport = () => {
    if (!tableExpenses.length) return;

    // Create CSV content
    const headers = [
      "Tanggal",
      "Kategori",
      "Keterangan",
      "Cabang",
      "Staff",
      "Jumlah",
    ];
    const rows = tableExpenses.map((e) => [
      e.date,
      e.category,
      e.note,
      e.branch,
      e.employeeName,
      e.amount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan_pengeluaran_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isCashier) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Laporan Keuangan
          </h1>
          <p className="text-muted-foreground">
            Ringkasan performa bisnis, omzet, dan pengeluaran
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Pilih Cabang" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="yesterday">Kemarin</SelectItem>
              <SelectItem value="this_week">Minggu Ini</SelectItem>
              <SelectItem value="this_month">Bulan Ini</SelectItem>
              <SelectItem value="this_year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!tableExpenses.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddExpenseOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Pengeluaran
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ReportSummary
            omzet={data.summary.omzet}
            expenses={data.summary.expenses}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2">
              <ExpensesTable expenses={tableExpenses} />
            </div>
            <TopProducts products={calculatedTopProducts} />
          </div>
        </>
      )}

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onConfirm={handleAddExpense}
        branches={branches}
      />
    </div>
  );
}
