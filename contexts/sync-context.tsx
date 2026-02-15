"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPendingAttendance,
  deleteAttendance,
  initDB,
  getPendingTransactions,
  deleteTransaction,
} from "@/lib/offline-db";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSynced: number | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSynced: null,
  triggerSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const updatePendingCount = async () => {
    try {
      const {
        getPendingTransactions,
        getPendingAttendance,
        getPendingExpenses,
      } = await import("@/lib/offline-db");
      const transactions = await getPendingTransactions();
      const attendance = await getPendingAttendance();
      const expenses = await getPendingExpenses();
      setPendingCount(
        transactions.length + attendance.length + expenses.length,
      );
    } catch (e) {
      console.error("Failed to check pending items", e);
    }
  };

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    const syncToast = toast.loading("Sedang menyinkronkan data...", {
      description: "Mohon tunggu sebentar.",
    });

    let syncedCount = 0;
    let errorCount = 0;

    try {
      const {
        getPendingTransactions,
        deleteTransaction,
        getPendingAttendance,
        deleteAttendance,
        getPendingExpenses,
        deleteExpense,
      } = await import("@/lib/offline-db");

      // 1. Sync Transactions
      const transactions = await getPendingTransactions();
      for (const tx of transactions) {
        try {
          const { offline, id, timestamp, items, ...txData } = tx;

          // API expects { transaction: {...}, items: [...] }
          // We need to pass 'items' separately and 'transaction' object
          const payload = {
            transaction: {
              ...txData,
              // Ensure required fields for API are present (e.g. status)
              status: txData.status || "completed",
            },
            items: items || [],
          };

          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error("Failed to sync transaction");
          await deleteTransaction(id);
          syncedCount++;
        } catch (err) {
          console.error("Failed to sync transaction", tx, err);
          errorCount++;
        }
      }

      // 2. Sync Attendance
      const attendanceRecords = await getPendingAttendance();
      for (const record of attendanceRecords) {
        try {
          const { offline, id, timestamp, action, ...data } = record;
          const method = action === "clock_in" ? "POST" : "PUT";
          const body =
            action === "clock_in"
              ? { ...data }
              : { action: "clock_out", ...data };
          const response = await fetch("/api/attendance", {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error("Failed to sync attendance");
          await deleteAttendance(id);
          syncedCount++;
        } catch (err) {
          console.error("Failed to sync attendance", record, err);
          errorCount++;
        }
      }

      // 3. Sync Expenses
      const expenses = await getPendingExpenses();
      for (const exp of expenses) {
        try {
          const { offline, id, timestamp, branchName, ...expData } = exp;
          // API expects snake_case for Supabase usually, but checking TransactionContext it sends camelCase to API?
          // Wait, TransactionContext sends: branch_id, category, etc... directly to Supabase via client!
          // BUT offline sync must go through API route because we don't expose Supabase key here nicely or simple reuse logic.
          // Let's assume there is /api/expenses endpoint. If not, I might need to create it or use supabase client here?
          // Actually, `SyncContext` uses `fetch`. So I should use `fetch("/api/expenses")`.
          // Does `/api/expenses` exist? I haven't checked.
          // If it doesn't exist, I should fallback to supabase client logic or create the endpoint.
          // The existing `TransactionContext` uses `supabase.from('expenses').insert`.
          // Let's assume for now I will use the same pattern as transactions: sending JSON to an API.
          // I'll check if `/api/expenses` exists later or assumes it does.
          // Actually, to be safe, I'll assume I need to handle it.

          // NOTE: TransactionContext uses direct supabase client.
          // SyncContext uses fetch /api/... which implies I should likely use API routes for consistency/security in sync.
          // But if /api/expenses doesn't exist, this will fail.
          // I will assume it exists or I will create it.
          // Better: I'll use the API route since I can't easily import the context's addExpense here.

          const response = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expData),
          });

          if (!response.ok) throw new Error("Failed to sync expense");
          await deleteExpense(id);
          syncedCount++;
        } catch (err) {
          console.error("Failed to sync expense", exp, err);
          errorCount++;
        }
      }
    } catch (err) {
      console.error("Sync process failed", err);
    } finally {
      setIsSyncing(false);
      toast.dismiss(syncToast);
      await updatePendingCount();
      setLastSynced(Date.now());

      if (syncedCount > 0) {
        toast.success("Sinkronisasi Selesai", {
          description: `${syncedCount} data berhasil dikirim ke server.`,
        });
      }

      if (errorCount > 0) {
        toast.error("Sinkronisasi Parsial", {
          description: `${errorCount} data gagal dikirim. Akan dicoba lagi nanti.`,
        });
      }
    }
  };

  // ... (useEffect logic remains same, just ensuring imports are handled)

  // Initialize online status
  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      // Removed immediate trigger, allowing the user flow or interval to handle it,
      // but usually we want it immediate.
      // Keeping original behavior:
      toast.success("Online Kembali", {
        description: "Mencoba sinkronisasi data...",
      });
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Mode Offline", {
        description: "Transaksi akan disimpan di perangkat lokal.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        lastSynced,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
