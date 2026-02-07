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
  getTransactionsByBranch: (branchName: string) => Transaction[];
  getExpensesByBranch: (branchName: string) => Expense[];
  getDailyRevenue: (date: Date, branchName?: string) => number;
  getMonthlyRevenue: (date: Date, branchName?: string) => number;
  getTotalRevenue: (branchName?: string) => number;
  getTopProducts: (
    limit?: number,
    branchName?: string,
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
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
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
        (e: DBExpense & { branches?: { name: string } }) => ({
          id: e.id,
          date: e.created_at,
          branchId: e.branch_id,
          branchName: e.branches?.name || "",
          category: e.category as Expense["category"],
          description: e.description,
          amount: Number(e.amount),
          recordedBy: e.recorded_by_name || "",
        }),
      );

      setExpenses(formattedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
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
    const transactionChannel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => fetchTransactions(),
      )
      .subscribe();

    const expenseChannel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchExpenses(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(expenseChannel);
    };
  }, [fetchTransactions, fetchExpenses]);

  const addTransaction = useCallback(
    async (
      trxData: Omit<Transaction, "id" | "date">,
      items: TransactionItem[],
    ) => {
      try {
        // Insert transaction
        const { data: newTrx, error: trxError } = await supabase
          .from("transactions")
          .insert({
            branch_id: trxData.branchId,
            cashier_id: trxData.cashierId,
            cashier_name: trxData.cashierName,
            customer_name: trxData.customerName,
            total_amount: trxData.totalAmount,
            payment_method: trxData.paymentMethod,
            amount_paid: trxData.amountPaid,
            change_amount: trxData.changeAmount,
            status: trxData.status || "completed",
          })
          .select()
          .single();

        if (trxError) throw trxError;

        // Insert transaction items
        if (newTrx && items.length > 0) {
          const itemsToInsert = items.map((item) => ({
            transaction_id: newTrx.id,
            product_id: item.productId,
            product_name: item.productName,
            variant_name: item.variant,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }));

          await supabase.from("transaction_items").insert(itemsToInsert);
        }

        await fetchTransactions();

        return {
          id: newTrx.id,
          date: newTrx.created_at,
          ...trxData,
          items,
        } as Transaction;
      } catch (error) {
        console.error("Error adding transaction:", error);
        return null;
      }
    },
    [fetchTransactions],
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
        recorded_by_name: expData.recordedBy,
      });

      if (error) throw error;
      await fetchExpenses();
    },
    [fetchExpenses],
  );

  // Analytics functions (keep same logic, just use state data)
  const getTransactionsByBranch = useCallback(
    (branchName: string) => {
      if (!branchName || branchName === "Semua Cabang") return transactions;
      return transactions.filter((t) => t.branchName === branchName);
    },
    [transactions],
  );

  const getExpensesByBranch = useCallback(
    (branchName: string) => {
      if (!branchName || branchName === "Semua Cabang") return expenses;
      return expenses.filter((e) => e.branchName === branchName);
    },
    [expenses],
  );

  const getDailyRevenue = useCallback(
    (date: Date, branchName?: string) => {
      const relevantTrx = branchName
        ? getTransactionsByBranch(branchName)
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
    (date: Date, branchName?: string) => {
      const relevantTrx = branchName
        ? getTransactionsByBranch(branchName)
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
    (branchName?: string) => {
      const relevantTrx = branchName
        ? getTransactionsByBranch(branchName)
        : transactions;
      return relevantTrx
        .filter((t) => t.status === "completed")
        .reduce((acc, t) => acc + t.totalAmount, 0);
    },
    [transactions, getTransactionsByBranch],
  );

  const getTopProducts = useCallback(
    (limit = 5, branchName?: string) => {
      const relevantTrx = branchName
        ? getTransactionsByBranch(branchName)
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
