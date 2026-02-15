"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useTransactions,
  Transaction as ContextTransaction,
} from "@/app/context/transaction-context";

// Local types or shared types
export interface ProductVariant {
  name: string;
  price: number;
}
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  trackStock: boolean;
  stock: number;
  image: string;
  status: "active" | "inactive";
  variants?: ProductVariant[];
}
// CartItem definition
export interface CartItem extends Omit<Product, "variants"> {
  quantity: number;
  variant: ProductVariant;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

import { CategorySelector } from "./components/category-selector";
import { ProductGrid } from "./components/product-grid";
import { CartSection } from "./components/cart-section";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Check,
  ShoppingBag,
  Lock,
  WalletCards,
  Settings,
  Store,
  User,
} from "lucide-react";
import { PrinterProvider, usePrinter } from "./context/printer-context";
import { TransactionHistory } from "./components/transaction-history";
import { PaymentModal } from "./components/payment-modal";
import { ShiftProvider, useShift } from "./context/shift-context";
import { ShiftModal } from "./components/shift-modal";
import { CashOutModal } from "./components/cash-out-modal";
import { SizeSelectionModal } from "./components/size-selection-modal";
import { PrinterSettingsModal } from "./components/printer-settings-modal";
import { useBranch } from "@/contexts/branch-context";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ConnectPrinterButton() {
  const { disconnect, connect, isConnected, isConnecting, deviceName, error } =
    usePrinter();
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handlePrinterClick = () => {
    if (isConnected) {
      setShowDisconnectAlert(true);
    } else {
      connect();
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
      <Button
        variant={isConnected ? "outline" : "default"}
        size="sm"
        className={`flex gap-2 transition-all ${
          isConnected
            ? "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 group"
            : "bg-slate-800 text-white hover:bg-slate-900"
        }`}
        onClick={handlePrinterClick}
        disabled={isConnecting}
      >
        {isConnected ? (
          <>
            <Check className="h-4 w-4 group-hover:hidden" />
            <Printer className="h-4 w-4 hidden group-hover:block" />
            <span className="hidden md:inline group-hover:hidden">
              {deviceName || "Printer Connected"}
            </span>
            <span className="hidden md:group-hover:inline">Disconnect</span>
          </>
        ) : (
          <>
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">
              {isConnecting ? "Menghubungkan..." : "Connect Printer"}
            </span>
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-slate-500 hover:text-slate-900"
        onClick={() => setShowSettings(true)}
        title="Pengaturan Printer"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <PrinterSettingsModal
        isOpen={showSettings}
        onOpenChange={setShowSettings}
      />

      <AlertDialog
        open={showDisconnectAlert}
        onOpenChange={setShowDisconnectAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Putuskan koneksi printer?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memutuskan koneksi dengan printer{" "}
              <span className="font-medium text-slate-900">
                {deviceName || "Bluetooth Printer"}
              </span>
              . Anda perlu menghubungkan ulang jika ingin mencetak struk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                disconnect();
                setShowDisconnectAlert(false);
              }}
            >
              Putuskan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KasirContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentBranch, logout, activeEmployee, isSuperAdmin } = useBranch();

  const handleLogout = () => {
    logout();
    router.push("/login"); // Assumes login route exists
  };

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Printer Context
  const { printReceipt, isConnected } = usePrinter();

  // Product Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  // Shift State
  const {
    isShiftOpen,
    shiftData,
    addTransaction: addTransactionToShift,
    addExpense,
    isLoading: isShiftLoading,
  } = useShift();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<"open" | "close">(
    "open",
  );

  const handleOpenShiftModal = () => {
    setShiftModalMode("close"); // Trigger close shift manually
    setIsShiftModalOpen(true);
  };

  // Transaction Context for Syncing
  const {
    transactions: allTransactions,
    addExpense: addTransactionExpense,
    addTransaction: addTransactionToDB,
  } = useTransactions();

  // Fetch Data
  const fetchData = useCallback(async () => {
    // Only show loading on initial load if products are empty
    if (products.length === 0) setIsDataLoading(true);

    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (Array.isArray(pData)) {
          setProducts(pData.filter((p: Product) => p.status === "active"));
        } else {
          console.error("Invalid products data", pData);
          setProducts([]);
        }
      }
      if (catRes.ok) setCategories(await catRes.json());
    } catch (error) {
      console.error("Failed to fetch products", error);
      toast.error("Gagal memuat produk");
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmCashOut = async (amount: number, description: string) => {
    try {
      // 1. Add to Shift Data (Local Cashier State)
      addExpense(amount, description);

      // 2. Sync to Global Transaction Data (Admin Report)
      await addTransactionExpense({
        branchId: currentBranch?.id || "unknown",
        branchName: currentBranch?.name || "Unknown Branch",
        category: "Operasional", // Default category for Quick Cash Out
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

  const handleAddToCart = (product: Product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      if (product.variants.length === 1) {
        handleConfirmAddToCart(product, product.variants[0]);
      } else {
        setSelectedProduct(product);
        setIsSizeModalOpen(true);
      }
    } else {
      // No variants (single price product)
      const defaultVariant: ProductVariant = {
        name: "Standard",
        price: product.price,
      };
      handleConfirmAddToCart(product, defaultVariant);
    }
  };

  const handleConfirmAddToCart = (
    product: Product,
    variant: ProductVariant,
  ) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id && item.variant.name === variant.name,
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.variant.name === variant.name
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      const { variants, ...productWithoutVariants } = product;
      return [
        ...prev,
        {
          ...productWithoutVariants,
          variant,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (
    id: string,
    change: number,
    variantName?: string,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch =
          item.id === id && (!variantName || item.variant.name === variantName);

        if (isMatch) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (id: string, variantName?: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.id === id &&
            (!variantName || item.variant.name === variantName)
          ),
      ),
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false); // Close mobile cart sheet
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (
    paymentMethod: "cash" | "qris",
    amountPaid: number,
  ) => {
    // Prepare Items for DB
    const transactionItems = cartItems.map((item) => ({
      productId: item.id,
      productName: item.name,
      variant: item.variant.name,
      quantity: item.quantity,
      price: item.variant.price,
      subtotal: item.variant.price * item.quantity,
    }));

    // Construct Transaction Object Data
    const transactionData = {
      branchId: currentBranch?.id || "unknown",
      branchName: currentBranch?.name || "Cabang Bestea",
      cashierId: activeEmployee?.id,
      cashierName: activeEmployee?.name || "Kasir",
      customerName: "Pelanggan",
      totalAmount: totalPrice,
      paymentMethod: paymentMethod,
      amountPaid: amountPaid,
      changeAmount: amountPaid - totalPrice,
      status: "completed" as const,
      shiftSessionId: shiftData?.sessionId,
      items: transactionItems,
    };

    try {
      let savedTransaction;

      // SIMULATION MODE: If Super Admin loops simulation (no shift open), do not save to DB
      if (isSuperAdmin && !isShiftOpen) {
        console.log("Processing Simulation Transaction (Not Saved to DB)");
        savedTransaction = {
          id: `sim-${Date.now()}`,
          transactionCode: `#SIM-${Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, "0")}`,
          date: new Date().toISOString(),
          branchId: currentBranch?.id || "unknown",
          branchName: currentBranch?.name || "Cabang Bestea",
          cashierId: activeEmployee?.id,
          cashierName: activeEmployee?.name || "Super Admin",
          customerName: "Pelanggan Simulasi",
          totalAmount: totalPrice,
          paymentMethod: paymentMethod,
          amountPaid: amountPaid,
          changeAmount: amountPaid - totalPrice,
          status: "completed" as const,
          items: transactionItems,
        };
        toast.info("Mode Simulasi: Transaksi tidak disimpan ke database", {
          duration: 4000,
        });
      } else {
        // NORMAL MODE: Save to Supabase (Database) via TransactionContext
        savedTransaction = await addTransactionToDB(
          transactionData,
          transactionItems,
        );

        if (!savedTransaction) {
          throw new Error("Gagal menyimpan transaksi (API Error)");
        }
      }

      if (savedTransaction) {
        // 2. Add to Local Shift Data (only if shift is open, but for simulation we might want to show it locally?
        // Actually addTransactionToShift updates the shift state, which might be null if no shift.
        // But let's try to update UI if possible, or just proceed to print.

        if (isShiftOpen) {
          const shiftTransaction = {
            id: savedTransaction.id,
            transactionCode: savedTransaction.transactionCode,
            date: new Date(savedTransaction.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            paymentMethod: savedTransaction.paymentMethod as "cash" | "qris",
            total: savedTransaction.totalAmount,
            time: new Date(savedTransaction.date).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: (savedTransaction.status === "void"
              ? "cancelled"
              : "completed") as "completed" | "pending" | "cancelled",
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

        // 3. Stock Reduction is now handled by API (skipped in simulation)

        // 4. Print Receipt
        // Construct the object expected by printReceipt
        const receiptData = {
          ...savedTransaction,
          // Ensure dates are strings or Date objects as expected by printReceipt
          // The mock simulation uses ISO string for date, printReceipt probably handles it or needs Date object?
          // Let's check printReceipt signature or usage.
          // Previous usage passed `shiftTransaction` which has formatted date/time strings.
          // Let's create a receipt-compatible object.
          transactionCode: savedTransaction.transactionCode,
          date: new Date(savedTransaction.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          time: new Date(savedTransaction.date).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          items: savedTransaction.items.map((item: any) => ({
            productId: item.productId,
            name: item.productName,
            price: item.price,
            quantity: item.quantity,
            variant: item.variant || "",
          })),
          total: savedTransaction.totalAmount, // shiftTransaction uses 'total'
          cashierName: savedTransaction.cashierName,
          paymentMethod: savedTransaction.paymentMethod,
          branchName:
            savedTransaction.branchName || currentBranch?.name || "Bestea",
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

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setCartItems([]);
    // Refresh products to show updated stock after transaction
    fetchData();
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.variant.price * item.quantity,
    0,
  );
  const totalPrice = subtotal;

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  const dailyTransactions = allTransactions.filter(
    (t) =>
      new Date(t.date).toDateString() === new Date().toDateString() &&
      t.status === "completed",
  );

  const currentOrderNumber = `Order #${String(dailyTransactions.length + 1).padStart(3, "0")}`;

  if (isShiftLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const displayCategories = categories;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 rounded-lg border border-slate-200 relative">
      {/* Shift Closed Overlay */}
      {!isShiftOpen && !isShiftLoading && !isSuperAdmin && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Kasir Tutup
            </h2>
            <p className="text-slate-500 mb-8">
              Sesi kasir saat ini sedang tutup. Silakan buka shift baru untuk
              memulai transaksi.
            </p>
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-lg h-12 rounded-xl shadow-lg shadow-green-200"
              onClick={() => {
                setShiftModalMode("open");
                setIsShiftModalOpen(true);
              }}
            >
              Buka Shift Kasir
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 md:p-6 pb-0">
            <header className="mb-4 md:mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                    {currentBranch?.name || "Kasir"}
                  </h1>
                  {isShiftOpen && (
                    <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold border border-green-200 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-green-200 shadow-[0_0_8px]" />
                      Open
                    </span>
                  )}
                  {activeEmployee && isShiftOpen && (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-200 flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {activeEmployee.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Pilih kategori dan produk untuk dipesan.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <ConnectPrinterButton />

                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="flex gap-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9 border border-slate-200 shadow-sm bg-white"
                  onClick={() => setIsCashOutOpen(true)}
                  title="Catat Pengeluaran"
                >
                  <WalletCards className="h-4 w-4 text-orange-500" />
                  <span className="hidden lg:inline text-xs font-medium">
                    Pengeluaran
                  </span>
                </Button>

                <TransactionHistory
                  transactions={shiftData?.transactions || []}
                  expenses={shiftData?.expenses || []}
                />

                {isShiftOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 ml-auto sm:ml-0 border border-slate-200 shadow-sm bg-white"
                    onClick={handleOpenShiftModal}
                    title="Tutup Kasir"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="hidden lg:inline text-xs font-medium">
                      Tutup Shift
                    </span>
                  </Button>
                )}
              </div>
            </header>

            <CategorySelector
              categories={displayCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 pb-24 md:pb-6">
            <ProductGrid
              products={products}
              selectedCategory={selectedCategory}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="w-[340px] shadow-xl relative z-10 hidden md:flex flex-col border-l border-slate-200 bg-white">
          <CartSection
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            orderNumber={currentOrderNumber}
          />
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div
        className={`md:hidden fixed bottom-4 left-4 right-4 p-4 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl z-40 shadow-lg mb-1 transition-all duration-300 ${
          isPaymentModalOpen || !isShiftOpen
            ? "opacity-0 translate-y-full pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {totalItems} items
            </p>
            <p className="font-bold text-lg text-slate-900 leading-none">
              {formatter.format(totalPrice)}
            </p>
          </div>

          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button
                size="default"
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 font-semibold shadow-md"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Pesanan
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 rounded-t-xl bg-slate-50"
            >
              <SheetHeader className="p-4 border-b border-slate-200 bg-white rounded-t-xl">
                <SheetTitle>Detail Pesanan</SheetTitle>
              </SheetHeader>
              <div className="h-full pb-12 bg-white">
                <CartSection
                  items={cartItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onCheckout={handleCheckout}
                  orderNumber={currentOrderNumber}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        total={totalPrice}
        onConfirm={handleConfirmPayment}
      />

      <ShiftModal
        isOpen={isShiftModalOpen}
        mode={shiftModalMode}
        onOpenChange={setIsShiftModalOpen}
      />

      <CashOutModal
        isOpen={isCashOutOpen}
        onClose={() => setIsCashOutOpen(false)}
        onConfirm={handleConfirmCashOut}
      />

      <SizeSelectionModal
        isOpen={isSizeModalOpen}
        onClose={() => {
          setIsSizeModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onConfirm={handleConfirmAddToCart}
      />
    </div>
  );
}

export default function KasirPage() {
  return (
    <PrinterProvider>
      <ShiftProvider>
        <div className="h-screen w-full bg-slate-100 overflow-hidden flex flex-col">
          <KasirContent />
        </div>
      </ShiftProvider>
    </PrinterProvider>
  );
}
