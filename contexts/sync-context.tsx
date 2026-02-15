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
          if (!tx || !tx.id || !tx.totalAmount) {
            console.warn("Skipping invalid transaction:", tx);
            if (tx && tx.id) await deleteTransaction(tx.id); // Delete if ID exists but data invalid
            continue;
          }

          const { offline, id, timestamp, items, ...txData } = tx;

          // API expects { transaction: {...}, items: [...] }
          // We need to pass 'items' separately and 'transaction' object
          const payload = {
            transaction: {
              ...txData,
              // Force status to completed during sync (offline transactions are technically completed locally)
              status: "completed",
            },
            items: items || [],
          };

          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const resJson = await response.json();
            throw new Error(
              resJson.error || resJson.message || "Failed to sync transaction",
            );
          }

          await deleteTransaction(id);
          syncedCount++;
        } catch (err: any) {
          console.error("Failed to sync transaction", tx, err);
          // Only toast if it's a real error, not just a skip
          if (err.message !== "Failed to sync transaction") {
            toast.error(`Gagal sync transaksi: ${err.message}`);
          }
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

          // Fix Payload for API
          // API expects 'recordedBy' to be the UUID (employeeId)
          const payload = {
            ...expData,
            recordedBy: expData.employeeId, // Send UUID
            recordedByName: expData.recordedBy, // Send Name
            amount: Number(expData.amount), // Ensure number
          };

          const response = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(
              errData.error || errData.message || "Failed to sync expense",
            );
          }
          await deleteExpense(id);
          syncedCount++;
        } catch (err: any) {
          console.error("Failed to sync expense", exp, err);
          toast.error(`Gagal sync pengeluaran: ${err.message}`);
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
