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
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  triggerSync: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize online status
  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
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

    // Initial check for pending items
    updatePendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const transactions = await getPendingTransactions();
      const attendance = await getPendingAttendance();
      setPendingCount(transactions.length + attendance.length);
    } catch (e) {
      console.error("Failed to check pending items", e);
    }
  };

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    try {
      // 1. Sync Transactions
      const transactions = await getPendingTransactions();

      for (const tx of transactions) {
        try {
          // Remove offline flag and local ID if needed before sending
          const { offline, id, timestamp, ...txData } = tx;

          // Call your API to create transaction
          const response = await fetch("/api/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(txData),
          });

          if (!response.ok) {
            throw new Error("Failed to sync transaction");
          }

          // If success, delete from local DB
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

          // Determine method and body based on action
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

          if (!response.ok) {
            throw new Error("Failed to sync attendance");
          }

          await deleteAttendance(id);
          syncedCount++;
        } catch (err) {
          console.error("Failed to sync attendance", record, err);
          errorCount++;
        }
      }
    } catch (err) {
      console.error("Sync process failed", err);
    } finally {
      setIsSyncing(false);
      await updatePendingCount();

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

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
