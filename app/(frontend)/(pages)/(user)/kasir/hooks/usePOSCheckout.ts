import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useBranch } from "@/contexts/branch-context";
import { useTransactions } from "@/app/context/transaction-context";
import { useShift } from "../context/shift-context";
import { usePrinter } from "../context/printer-context";
import type { Product, CartItem, ProductVariant } from "../page";

interface Category {
  id: string;
  name: string;
  productCount: number;
}

export function usePOSCheckout() {
  const { currentBranch, activeEmployee, isSuperAdmin } = useBranch();
  const { isShiftOpen, shiftData, addTransaction: addTransactionToShift, addExpense, isLoading: isShiftLoading } = useShift();
  const { transactions: allTransactions, addExpense: addTransactionExpense, addTransaction: addTransactionToDB } = useTransactions();
  const { printReceipt, isConnected } = usePrinter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<"open" | "close">("open");

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartItems.reduce((acc, item) => acc + item.variant.price * item.quantity, 0);

  const fetchData = useCallback(async () => {
    if (products.length === 0) setIsDataLoading(true);
    try {
      const productUrl = currentBranch?.id 
        ? `/api/products?branch_id=${currentBranch.id}` 
        : "/api/products";

      const [prodRes, catRes] = await Promise.all([
        fetch(productUrl, { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (Array.isArray(pData)) {
          const activeProducts = pData.filter((p: Product) => p.status === "active");
          setProducts(activeProducts);
          const { saveProductsCache } = await import("@/lib/offline-db");
          saveProductsCache(activeProducts);
        } else {
          setProducts([]);
        }
      }
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        try {
          const { getProductsCache } = await import("@/lib/offline-db");
          const cachedProducts = await getProductsCache();
          if (cachedProducts && cachedProducts.length > 0) {
            setProducts(cachedProducts);
            toast.info("Mode Offline: Menggunakan data produk lokal.");
          }
        } catch (cacheErr) {
          console.error("Cache load failed", cacheErr);
        }
      } else {
        toast.error("Gagal memuat produk (Koneksi Bermasalah)");
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [currentBranch?.id]);

  useEffect(() => {
    if (currentBranch?.id) {
      fetchData();
    }
  }, [fetchData, currentBranch?.id]);

  const handleAddToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      if (product.variants.length === 1) {
        handleConfirmAddToCart(product, product.variants[0]);
      } else {
        setSelectedProduct(product);
        setIsSizeModalOpen(true);
      }
    } else {
      const defaultVariant: ProductVariant = { name: "Standard", price: product.price };
      handleConfirmAddToCart(product, defaultVariant);
    }
  };

  const handleConfirmAddToCart = (product: Product, variant: ProductVariant) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.variant.name === variant.name);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.variant.name === variant.name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      const { variants, ...productWithoutVariants } = product;
      return [...prev, { ...productWithoutVariants, variant, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, change: number, variantName?: string) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch = item.id === id && (!variantName || item.variant.name === variantName);
        if (isMatch) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string, variantName?: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === id && (!variantName || item.variant.name === variantName)))
    );
  };

  const handleConfirmPayment = async (paymentMethod: "cash" | "qris", amountPaid: number) => {
    const transactionItems = cartItems.map((item) => ({
      productId: item.id,
      productName: item.name,
      variant: item.variant.name,
      quantity: item.quantity,
      price: item.variant.price,
      subtotal: item.variant.price * item.quantity,
    }));

    if (!currentBranch?.id && !isSuperAdmin) {
      toast.error("Gagal memproses transaksi: ID Cabang tidak ditemukan");
      return;
    }

    const transactionData = {
      branchId: currentBranch?.id || "",
      branchName: currentBranch?.name || "Cabang Bestea",
      cashierId: activeEmployee?.id,
      cashierName: activeEmployee?.name || "Kasir",
      customerName: "Pelanggan",
      totalAmount: totalPrice,
      paymentMethod,
      amountPaid,
      changeAmount: amountPaid - totalPrice,
      status: "completed" as const,
      shiftSessionId: shiftData?.sessionId,
      items: transactionItems,
    };

    try {
      let savedTransaction;

      if (isSuperAdmin && !isShiftOpen) {
        savedTransaction = {
          id: `sim-${Date.now()}`,
          transactionCode: `#SIM-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          date: new Date().toISOString(),
          ...transactionData,
        };
        toast.info("Mode Simulasi: Transaksi tidak disimpan ke database", { duration: 4000 });
      } else {
        savedTransaction = await addTransactionToDB(transactionData, transactionItems);
        if (!savedTransaction) throw new Error("Gagal menyimpan transaksi (API Error)");
      }

      if (savedTransaction) {
        if (isShiftOpen) {
          const shiftTransaction = {
            id: savedTransaction.id,
            transactionCode: savedTransaction.transactionCode,
            date: new Date(savedTransaction.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
            paymentMethod: savedTransaction.paymentMethod as "cash" | "qris",
            total: savedTransaction.totalAmount,
            time: new Date(savedTransaction.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            status: (savedTransaction.status === "void" ? "cancelled" : "completed") as "completed" | "pending" | "cancelled",
            items: savedTransaction.items.map((item: any) => ({
              productId: item.productId,
              name: item.productName,
              price: item.price,
              quantity: item.quantity,
              variant: item.variant || "",
            })),
            employeeId: savedTransaction.cashierId,
            employeeName: savedTransaction.cashierName,
            branchName: savedTransaction.branchName,
            cashierName: savedTransaction.cashierName,
          };
          addTransactionToShift(shiftTransaction);
        }

        if (transactionItems.length > 0) {
          const { saveProductsCache } = await import("@/lib/offline-db");
          setProducts((prevProducts) => {
            const updatedProducts = prevProducts.map((p) => {
              const totalQuantitySold = cartItems.filter((item) => item.id === p.id).reduce((sum, item) => sum + item.quantity, 0);
              if (totalQuantitySold > 0 && p.trackStock) {
                return { ...p, stock: p.stock - totalQuantitySold };
              }
              return p;
            });
            saveProductsCache(updatedProducts);
            return updatedProducts;
          });
        }

        const receiptData = {
          ...savedTransaction,
          transactionCode: savedTransaction.transactionCode,
          date: new Date(savedTransaction.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
          time: new Date(savedTransaction.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          items: savedTransaction.items.map((item: any) => ({
             productId: item.productId,
             name: item.productName,
             price: item.price,
             quantity: item.quantity,
             variant: item.variant || "",
          })),
          total: savedTransaction.totalAmount,
          cashierName: savedTransaction.cashierName,
          paymentMethod: savedTransaction.paymentMethod,
          branchName: savedTransaction.branchName || currentBranch?.name || "Bestea",
        };

        if (isConnected) {
          await printReceipt(receiptData);
        }
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      toast.error("Transaksi Gagal");
    }
  };

  const handleConfirmCashOut = async (amount: number, description: string) => {
    try {
      if (!currentBranch?.id) {
        toast.error("Gagal mencatat pengeluaran: ID Cabang tidak ditemukan");
        return;
      }
      addExpense(amount, description);
      await addTransactionExpense({
        branchId: currentBranch.id,
        branchName: currentBranch?.name || "Unknown Branch",
        category: "Operasional",
        description: description,
        amount: amount,
        recordedBy: activeEmployee?.name || "Kasir",
        employeeId: activeEmployee?.id,
        shiftSessionId: shiftData?.sessionId,
      });

      toast.success("Pengeluaran berhasil dicatat");
      setIsCashOutOpen(false);
    } catch (error) {
      console.error("Failed to record expense:", error);
      toast.error("Gagal mencatat pengeluaran");
    }
  };

  // Get Order Number logic
  const dailyTransactions = allTransactions.filter((t) =>
    new Date(t.date).toDateString() === new Date().toDateString() && (t.status === "completed" || t.status === "pending")
  );

  let nextOrderSeq = 1;
  const highestCodeTrx = dailyTransactions
    .filter((t) => t.transactionCode?.startsWith("#"))
    .sort((a, b) => {
      const numA = parseInt(a.transactionCode!.replace("#", "") || "0");
      const numB = parseInt(b.transactionCode!.replace("#", "") || "0");
      return numB - numA;
    })[0];

  if (highestCodeTrx?.transactionCode) {
    const lastNum = parseInt(highestCodeTrx.transactionCode.replace("#", ""));
    if (!isNaN(lastNum)) {
      nextOrderSeq = lastNum + 1;
    }
  } else if (dailyTransactions.length > 0) {
    nextOrderSeq = dailyTransactions.length + 1;
  }

  const currentOrderNumber = `Order #${String(nextOrderSeq).padStart(3, "0")}`;

  return {
    // Data state
    products,
    categories,
    isDataLoading,
    currentBranch,
    activeEmployee,
    isSuperAdmin,
    
    // UI state
    selectedCategory,
    setSelectedCategory,
    cartItems,
    setCartItems,
    isCartOpen,
    setIsCartOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedProduct,
    setSelectedProduct,
    isSizeModalOpen,
    setIsSizeModalOpen,
    isShiftModalOpen,
    setIsShiftModalOpen,
    isCashOutOpen,
    setIsCashOutOpen,
    shiftModalMode,
    setShiftModalMode,
    
    // Shift & Context variables
    isShiftOpen,
    shiftData,
    isShiftLoading,
    totalItems,
    totalPrice,
    currentOrderNumber,

    // Actions
    fetchData,
    handleAddToCart,
    handleConfirmAddToCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleConfirmPayment,
    handleConfirmCashOut,
  };
}
