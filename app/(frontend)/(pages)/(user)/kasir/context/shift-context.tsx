"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Transaction } from "../data/mock-data";
import { useSync } from "@/contexts/sync-context";

export interface Expense {
  id: string;
  amount: number;
  description: string;
  time: string;
  employeeId?: string;
  employeeName?: string;
}

export interface ShiftEmployee {
  id: string;
  name: string;
  role: string;
  branchId?: string;
}

export interface ShiftData {
  startTime: string | null;
  endTime: string | null;
  initialCash: number;
  totalCashTransactions: number;
  totalQrisTransactions: number;
  totalExpenses: number;
  expenses: Expense[];
  transactions: Transaction[];
  expectedCash: number;
  actualCash: number | null;
  discrepancy: number | null;
  notes: string | null;
  branchName: string;
  // Employee tracking
  openedBy: ShiftEmployee | null;
  closedBy: ShiftEmployee | null;
  sessionId?: string;
}

interface ShiftContextType {
  isShiftOpen: boolean;
  shiftData: ShiftData;
  openShift: (
    initialCash: number,
    employee: ShiftEmployee,
    branchId: string,
  ) => void;
  closeShift: (
    actualCash: number,
    employee: ShiftEmployee,
    notes?: string,
  ) => void;
  addTransaction: (transaction: Transaction) => void;
  addExpense: (
    amount: number,
    description: string,
    employee?: ShiftEmployee,
  ) => void;
  isLoading: boolean;
  checkActiveSession: (branchId: string) => Promise<any>;
  resumeShift: (session: any) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shiftData, setShiftData] = useState<ShiftData>({
    startTime: null,
    endTime: null,
    initialCash: 0,
    totalCashTransactions: 0,
    totalQrisTransactions: 0,
    totalExpenses: 0,
    expenses: [],
    transactions: [],
    expectedCash: 0,
    actualCash: null,
    discrepancy: null,
    notes: null,
    branchName: "",
    openedBy: null,
    closedBy: null,
  });

  // Load shift state and selected branch from local storage on mount
  useEffect(() => {
    // Load selected branch
    const savedBranch = localStorage.getItem("bestea-kasir-branch");
    let branchName = "Cabang Bangil"; // fallback
    if (savedBranch) {
      try {
        const parsed = JSON.parse(savedBranch);
        branchName = parsed.name || branchName;
      } catch (e) {
        // silently ignore parse errors
      }
    }

    // Load shift state
    const savedShift = localStorage.getItem("bestea-pos-shift");
    if (savedShift) {
      const parsed = JSON.parse(savedShift);
      if (parsed.isShiftOpen) {
        setIsShiftOpen(true);
        setShiftData(parsed.shiftData);
      } else {
        // Set branch name for new shift
        setShiftData((prev) => ({ ...prev, branchName }));
      }
    } else {
      // Set branch name for new shift
      setShiftData((prev) => ({ ...prev, branchName }));
    }
    setIsLoading(false);
  }, []);

  // Save shift state to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "bestea-pos-shift",
      JSON.stringify({ isShiftOpen, shiftData }),
    );
  }, [isShiftOpen, shiftData]);

  const checkActiveSession = async (branchId: string) => {
    try {
      const res = await fetch(
        `/api/shift-sessions?branchId=${branchId}&status=open`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        // If data is returned (not null/empty), it means there is an open shift
        if (data && data.id) return data;
      }
      return null;
    } catch (error) {
      console.error("Failed to check active session:", error);
      return null;
    }
  };

  const resumeShift = (session: any) => {
    // Map API session to local ShiftData
    // We might need to fetch transactions/expenses if we want full state restoration,
    // but for now let's restore the basic session info.
    // Ideally, we should fetch the transactions for this session too.

    const restoredData: ShiftData = {
      sessionId: session.id,
      startTime: session.start_time,
      endTime: null,
      initialCash: session.initial_cash || 0,
      totalCashTransactions: 0, // Should be calculated from fetched transactions
      totalQrisTransactions: 0,
      totalExpenses: 0,
      expenses: [],
      transactions: [],
      expectedCash: session.initial_cash || 0, // Simplified for now
      actualCash: null,
      discrepancy: null,
      notes: null,
      branchName: shiftData.branchName, // Keep current branch name
      openedBy: {
        id: session.opener?.id,
        name: session.opener?.name,
        role: session.opener?.role,
        branchId: session.branch_id,
      },
      closedBy: null,
    };

    setShiftData(restoredData);
    setIsShiftOpen(true);
  };

  const openShift = async (
    initialCash: number,
    employee: ShiftEmployee,
    branchId: string,
  ) => {
    try {
      // 1. Call API to create session
      const res = await fetch("/api/shift-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          employeeId: employee.id,
          initialCash,
        }),
      });

      const session = await res.json();
      if (!res.ok) throw new Error(session.error);

      const now = new Date().toISOString();
      const newShiftData = {
        sessionId: session.id, // Store ID
        startTime: now,
        endTime: null,
        initialCash,
        totalCashTransactions: 0,
        totalQrisTransactions: 0,
        totalExpenses: 0,
        expenses: [],
        transactions: [],
        expectedCash: initialCash,
        actualCash: null,
        discrepancy: null,
        notes: null,
        branchName: shiftData.branchName,
        openedBy: employee,
        closedBy: null,
      };

      setShiftData(newShiftData);
      setIsShiftOpen(true);
      return session; // Return for caller if needed
    } catch (error) {
      throw error; // Re-throw to let Modal handle UI
    }
  };

  const closeShift = async (
    actualCash: number,
    employee: ShiftEmployee,
    notes?: string,
  ) => {
    try {
      const now = new Date().toISOString();
      const discrepancy = actualCash - shiftData.expectedCash;

      // 1. Call API to update/close session
      if (shiftData.sessionId) {
        await fetch("/api/shift-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: shiftData.sessionId,
            employeeId: employee.id,
            actualCash,
            expectedCash: shiftData.expectedCash,
            notes,
          }),
        });
      }

      setShiftData((prev) => ({
        ...prev,
        endTime: now,
        actualCash,
        discrepancy,
        notes: notes || null,
        closedBy: employee,
      }));
      setIsShiftOpen(false);
    } catch (error) {
      // We still close locally to avoid getting stuck
      setIsShiftOpen(false);
    }
  };

  const addTransaction = (transaction: Transaction) => {
    if (!isShiftOpen) return;

    setShiftData((prev) => {
      const newTotalCash =
        transaction.paymentMethod === "cash"
          ? prev.totalCashTransactions + transaction.total
          : prev.totalCashTransactions;

      const newTotalQris =
        transaction.paymentMethod === "qris"
          ? prev.totalQrisTransactions + transaction.total
          : prev.totalQrisTransactions;

      return {
        ...prev,
        totalCashTransactions: newTotalCash,
        totalQrisTransactions: newTotalQris,
        transactions: [transaction, ...prev.transactions],
        expectedCash: prev.initialCash + newTotalCash - prev.totalExpenses,
      };
    });
  };

  const addExpense = (
    amount: number,
    description: string,
    employee?: ShiftEmployee,
  ) => {
    if (!isShiftOpen) return;

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      amount,
      description,
      time: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      employeeId: employee?.id,
      employeeName: employee?.name,
    };

    setShiftData((prev) => {
      const newTotalExpenses = prev.totalExpenses + amount;
      return {
        ...prev,
        expenses: [newExpense, ...prev.expenses],
        totalExpenses: newTotalExpenses,
        expectedCash:
          prev.initialCash + prev.totalCashTransactions - newTotalExpenses,
      };
    });
  };

  // Sync Integration
  const { lastSynced } = useSync();

  const refreshShiftData = async () => {
    if (!shiftData.sessionId) return;

    try {
      const res = await fetch(`/api/shift-sessions/${shiftData.sessionId}`);
      if (res.ok) {
        const session = await res.json();

        // Transform API data to ShiftData format
        const refreshedData: ShiftData = {
          ...shiftData,
          totalCashTransactions: session.cash_transactions_total || 0,
          totalQrisTransactions: session.qris_transactions_total || 0,
          totalExpenses: session.expenses_total || 0,
          // We need to fetch transactions and expenses specifically if the session endpoint doesn't return them array-wise
          // Assuming the session endpoint might not return all child data, we might need separate calls or a compund call.
          // For now, let's assume we rely on the session totals, but for the TABLE list, we need the actual items.
          // If the API doesn't return items, we might need to fetch them.
          // Let's try to fetch transactions for this session.
        };

        // Fetch specific transactions for this session to update IDs
        const trxRes = await fetch(
          `/api/transactions?shiftSessionId=${shiftData.sessionId}`,
        );
        const expRes = await fetch(
          `/api/expenses?shiftSessionId=${shiftData.sessionId}`,
        );

        if (trxRes.ok && expRes.ok) {
          const transactions = await trxRes.json();
          const expenses = await expRes.json();

          setShiftData((prev) => ({
            ...prev,
            ...refreshedData,
            transactions: transactions.map((t: any) => ({
              id: t.id,
              transactionCode: t.transaction_code,
              date: new Date(t.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              paymentMethod: t.payment_method,
              total: t.total_amount,
              time: new Date(t.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              status: t.status === "void" ? "cancelled" : "completed",
              items: t.transaction_items.map((i: any) => ({
                productId: i.product_id,
                name: i.product_name,
                price: i.price,
                quantity: i.quantity,
                variant: i.variant_name,
              })),
              employeeId: t.cashier_id,
              employeeName: t.cashier_name,
              branchName: t.branches?.name,
              cashierName: t.cashier_name,
            })),
            expenses: expenses.map((e: any) => ({
              id: e.id,
              amount: e.amount,
              description: e.description,
              time: new Date(e.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              employeeId: e.recorded_by,
              employeeName: e.recorded_by_name,
            })),
          }));
        }
      }
    } catch (error) {
      console.error("Failed to refresh shift data", error);
    }
  };

  useEffect(() => {
    if (lastSynced && isShiftOpen) {
      // Small delay to ensure server processing is complete and race conditions
      setTimeout(() => {
        refreshShiftData();
        // toast.info("Memperbarui data shift..."); // Optional feedback
      }, 1000);
    }
  }, [lastSynced, isShiftOpen]);

  return (
    <ShiftContext.Provider
      value={{
        isShiftOpen,
        shiftData,
        openShift,
        closeShift,
        addTransaction,
        addExpense,
        isLoading,
        checkActiveSession,
        resumeShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
}
