"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Transaction as DBTransaction,
  TransactionItem as DBTransactionItem,
  Expense as DBExpense,
} from "@/lib/supabase/types";
import { isSameDay, isSameMonth, parseISO } from "date-fns";

// Types compatible with existing UI
export interface TransactionItem {
  productId: string;
  productName: string;
  variant?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentMethod: "cash" | "qris" | "debit";
  amountPaid?: number;
  changeAmount?: number;
  status: "completed" | "void" | "pending";
  shiftSessionId?: string;
  transactionCode?: string;
}

export interface Expense {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  category: "Operasional" | "Bahan Baku" | "Gaji" | "Sewa" | "Lainnya";
  description: string;
  amount: number;
  recordedBy: string;
  employeeId?: string;
  shiftSessionId?: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  expenses: Expense[];
  isLoading: boolean;
  addTransaction: (
    transaction: Omit<Transaction, "id" | "date">,
    items: TransactionItem[],
  ) => Promise<Transaction | null>;
  addExpense: (expense: Omit<Expense, "id" | "date">) => Promise<void>;
  voidTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  getTransactionsByBranch: (branchIdOrName: string) => Transaction[];
  getExpensesByBranch: (branchIdOrName: string) => Expense[];
  getDailyRevenue: (date: Date, branchIdOrName?: string) => number;
  getMonthlyRevenue: (date: Date, branchIdOrName?: string) => number;
  getTotalRevenue: (branchIdOrName?: string) => number;
  getTopProducts: (
    limit?: number,
    branchIdOrName?: string,
  ) => { name: string; sold: number; revenue: number }[];
  getBranchPerformance: () => {
    branch: string;
    revenue: number;
    percentage: number;
  }[];
  getDailyStats: () => {
    revenue: number;
    revenueGrowth: number;
    transactions: number;
    transactionGrowth: number;
    activeBranches: number;
    productsSold: number;
    productGrowth: number;
  };
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined,
);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch transactions with items from Supabase
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          branches (name),
          transaction_items (*)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedTransactions: Transaction[] = (data || []).map(
        (
          t: DBTransaction & {
            branches?: { name: string };
            transaction_items?: DBTransactionItem[];
            shift_session_id?: string;
            transaction_code?: string;
          },
        ) => ({
          id: t.id,
          date: t.created_at,
          branchId: t.branch_id,
          branchName: t.branches?.name || "",
          cashierId: t.cashier_id,
          cashierName: t.cashier_name || "",
          customerName: t.customer_name,
          totalAmount: Number(t.total_amount),
          paymentMethod: t.payment_method as "cash" | "qris" | "debit",
          amountPaid: t.amount_paid ? Number(t.amount_paid) : undefined,
          changeAmount: t.change_amount ? Number(t.change_amount) : undefined,
          status: t.status as "completed" | "void" | "pending",
          shiftSessionId: t.shift_session_id,
          transactionCode: t.transaction_code,
          items: (t.transaction_items || []).map((item) => ({
            productId: item.product_id || "",
            productName: item.product_name,
            variant: item.variant_name,
            quantity: item.quantity,
            price: Number(item.price),
            subtotal: Number(item.subtotal),
          })),
        }),
      );

      setTransactions(formattedTransactions);
    } catch (error) {}
  }, []);

  // Fetch expenses from Supabase
  const fetchExpenses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          branches (name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedExpenses: Expense[] = (data || []).map(
        (
          e: DBExpense & {
            branches?: { name: string };
            shift_session_id?: string;
          },
        ) => ({
          id: e.id,
          date: e.created_at,
          branchId: e.branch_id,
          branchName: e.branches?.name || "",
          category: e.category as Expense["category"],
          description: e.description,
          amount: Number(e.amount),
          recordedBy: e.recorded_by_name || "",
          shiftSessionId: e.shift_session_id,
        }),
      );

      setExpenses(formattedExpenses);
    } catch (error) {}
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchTransactions(), fetchExpenses()]);
      setIsLoading(false);
    };
    init();
  }, [fetchTransactions, fetchExpenses]);

  // Realtime subscriptions
  useEffect(() => {
    let transactionTimeout: NodeJS.Timeout;

    // Debounced fetch to handle rapid updates and race conditions (trx vs items)
    const debouncedRefreshTransactions = () => {
      clearTimeout(transactionTimeout);
      transactionTimeout = setTimeout(() => {
        fetchTransactions();
      }, 1000); // 1s delay to ensure all items are inserted
    };

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        debouncedRefreshTransactions,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transaction_items" },
        debouncedRefreshTransactions,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchExpenses(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(transactionTimeout);
    };
  }, [fetchTransactions, fetchExpenses]);

  const addTransaction = useCallback(
    async (
      trxData: Omit<Transaction, "id" | "date">,
      items: TransactionItem[],
    ) => {
      try {
        // Offline Handling
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const offlineId = `offline-${Date.now()}`;
          const now = new Date().toISOString();

          // Construct offline transaction object
          const offlineTransaction: Transaction = {
            id: offlineId,
            date: now,
            branchId: trxData.branchId,
            branchName: trxData.branchName,
            cashierId: trxData.cashierId,
            cashierName: trxData.cashierName,
            customerName: trxData.customerName,
            totalAmount: trxData.totalAmount,
            paymentMethod: trxData.paymentMethod,
            amountPaid: trxData.amountPaid,
            changeAmount: trxData.changeAmount,
            status: "pending", // Mark as pending sync
            shiftSessionId: trxData.shiftSessionId,
            transactionCode: `OFF-${Math.floor(Math.random() * 1000)}`,
            items: items,
          };

          // Save to IndexedDB
          const { saveOfflineTransaction } = await import("@/lib/offline-db");
          await saveOfflineTransaction(offlineTransaction);

          // Optimistic UI Update
          setTransactions((prev) => [offlineTransaction, ...prev]);

          return offlineTransaction;
        }

        // Online: Call Backend API
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction: {
              branchId: trxData.branchId,
              cashierId: trxData.cashierId,
              cashierName: trxData.cashierName,
              customerName: trxData.customerName,
              totalAmount: trxData.totalAmount,
              paymentMethod: trxData.paymentMethod,
              amountPaid: trxData.amountPaid,
              changeAmount: trxData.changeAmount,
              status: trxData.status || "completed",
              shiftSessionId: trxData.shiftSessionId,
            },
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              variant: item.variant,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Transaction API Failed Details:", errorData);
          throw new Error(errorData.error || "Failed to save transaction");
        }

        const savedTransaction = await response.json();

        // Optimistic update or wait for realtime (realtime subscription handles this usually)
        // fetchTransactions();

        return savedTransaction;
      } catch (error) {
        console.error("Error adding transaction:", error);
        return null;
      }
    },
    [],
  );

  const voidTransaction = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "void" })
        .eq("id", id);

      if (error) throw error;
      await fetchTransactions();
    },
    [fetchTransactions],
  );

  const addExpense = useCallback(
    async (expData: Omit<Expense, "id" | "date">) => {
      const { error } = await supabase.from("expenses").insert({
        branch_id: expData.branchId,
        category: expData.category,
        description: expData.description,
        amount: expData.amount,
        recorded_by: expData.employeeId, // Use UUID for relation
        recorded_by_name: expData.recordedBy, // Keep name for legacy/display
        shift_session_id: expData.shiftSessionId,
      });

      if (error) throw error;
      await fetchExpenses();
    },
    [fetchExpenses],
  );

  // Analytics functions (keep same logic, just use state data)
  const getTransactionsByBranch = useCallback(
    (branchIdOrName: string) => {
      if (
        !branchIdOrName ||
        branchIdOrName === "Semua Cabang" ||
        branchIdOrName === "all"
      )
        return transactions;
      return transactions.filter(
        (t) => t.branchName === branchIdOrName || t.branchId === branchIdOrName,
      );
    },
    [transactions],
  );

  const getExpensesByBranch = useCallback(
    (branchIdOrName: string) => {
      if (
        !branchIdOrName ||
        branchIdOrName === "Semua Cabang" ||
        branchIdOrName === "all"
      )
        return expenses;
      return expenses.filter(
        (e) => e.branchName === branchIdOrName || e.branchId === branchIdOrName,
      );
    },
    [expenses],
  );

  const getDailyRevenue = useCallback(
    (date: Date, branchIdOrName?: string) => {
      const relevantTrx = branchIdOrName
        ? getTransactionsByBranch(branchIdOrName)
        : transactions;
      return relevantTrx
        .filter(
          (t) => isSameDay(parseISO(t.date), date) && t.status === "completed",
        )
        .reduce((acc, t) => acc + t.totalAmount, 0);
    },
    [transactions, getTransactionsByBranch],
  );

  const getMonthlyRevenue = useCallback(
    (date: Date, branchIdOrName?: string) => {
      const relevantTrx = branchIdOrName
        ? getTransactionsByBranch(branchIdOrName)
        : transactions;
      return relevantTrx
        .filter(
          (t) =>
            isSameMonth(parseISO(t.date), date) && t.status === "completed",
        )
        .reduce((acc, t) => acc + t.totalAmount, 0);
    },
    [transactions, getTransactionsByBranch],
  );

  const getTotalRevenue = useCallback(
    (branchIdOrName?: string) => {
      const relevantTrx = branchIdOrName
        ? getTransactionsByBranch(branchIdOrName)
        : transactions;
      return relevantTrx
        .filter((t) => t.status === "completed")
        .reduce((acc, t) => acc + t.totalAmount, 0);
    },
    [transactions, getTransactionsByBranch],
  );

  const getTopProducts = useCallback(
    (limit = 5, branchIdOrName?: string) => {
      const relevantTrx = branchIdOrName
        ? getTransactionsByBranch(branchIdOrName)
        : transactions;
      const productMap = new Map<
        string,
        { name: string; sold: number; revenue: number }
      >();

      relevantTrx.forEach((t) => {
        if (t.status !== "completed") return;
        t.items.forEach((item) => {
          const existing = productMap.get(item.productName) || {
            name: item.productName,
            sold: 0,
            revenue: 0,
          };
          existing.sold += item.quantity;
          existing.revenue += item.subtotal;
          productMap.set(item.productName, existing);
        });
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, limit);
    },
    [transactions, getTransactionsByBranch],
  );

  const getBranchPerformance = useCallback(() => {
    const branchMap = new Map<string, number>();
    let total = 0;

    transactions.forEach((t) => {
      if (t.status !== "completed") return;
      const current = branchMap.get(t.branchName) || 0;
      branchMap.set(t.branchName, current + t.totalAmount);
      total += t.totalAmount;
    });

    return Array.from(branchMap.entries())
      .map(([branch, revenue]) => ({
        branch,
        revenue,
        percentage: total > 0 ? Math.round((revenue / total) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [transactions]);

  const getDailyStats = useCallback(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayTrx = transactions.filter(
      (t) => isSameDay(parseISO(t.date), today) && t.status === "completed",
    );
    const yesterdayTrx = transactions.filter(
      (t) => isSameDay(parseISO(t.date), yesterday) && t.status === "completed",
    );

    const todayRevenue = todayTrx.reduce((acc, t) => acc + t.totalAmount, 0);
    const yesterdayRevenue = yesterdayTrx.reduce(
      (acc, t) => acc + t.totalAmount,
      0,
    );

    const todayProducts = todayTrx.reduce(
      (acc, t) => acc + t.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const yesterdayProducts = yesterdayTrx.reduce(
      (acc, t) => acc + t.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );

    const activeBranches = new Set(transactions.map((t) => t.branchName)).size;

    return {
      revenue: todayRevenue,
      revenueGrowth:
        yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : 0,
      transactions: todayTrx.length,
      transactionGrowth:
        yesterdayTrx.length > 0
          ? ((todayTrx.length - yesterdayTrx.length) / yesterdayTrx.length) *
            100
          : 0,
      activeBranches,
      productsSold: todayProducts,
      productGrowth:
        yesterdayProducts > 0
          ? ((todayProducts - yesterdayProducts) / yesterdayProducts) * 100
          : 0,
    };
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        expenses,
        isLoading,
        addTransaction,
        addExpense,
        voidTransaction,
        refreshTransactions: fetchTransactions,
        refreshExpenses: fetchExpenses,
        getTransactionsByBranch,
        getExpensesByBranch,
        getDailyRevenue,
        getMonthlyRevenue,
        getTotalRevenue,
        getTopProducts,
        getBranchPerformance,
        getDailyStats,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error(
      "useTransactions must be used within a TransactionProvider",
    );
  }
  return context;
}
