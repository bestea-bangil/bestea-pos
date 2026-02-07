"use client";

import { useState, useEffect } from "react";
import {
  Product,
  ProductVariant,
} from "../../(dashboard)/dashboard/produk/data/mock-data-products";
import { useProducts } from "@/app/context/product-context";
import {
  useTransactions,
  Transaction as ContextTransaction,
} from "@/app/context/transaction-context";
// Define CartItem locally since it's POS specific for now or we could move it to a shared type file.
// For simplicity, let's redefine it here compatible with the new Product structure.
export interface CartItem extends Omit<Product, "variants"> {
  quantity: number;
  variant: ProductVariant;
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
} from "lucide-react";
import { PrinterProvider, usePrinter } from "./context/printer-context";
import { TransactionHistory } from "./components/transaction-history";
import { PaymentModal } from "./components/payment-modal";
import { ShiftProvider, useShift } from "./context/shift-context";
import { ShiftModal } from "./components/shift-modal";
import { CashOutModal } from "./components/cash-out-modal";
import { SizeSelectionModal } from "./components/size-selection-modal";
import { PrinterSettingsModal } from "./components/printer-settings-modal";
import { useEmployee } from "@/app/context/employee-context";
import { useBranch } from "@/contexts/branch-context";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

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

  // Import PrinterSettingsModal dynamically or at top level? Top level is better.
  // But wait, I need to add the import statement effectively.
  // Since I can't add imports with this tool easily without multi-replace or careful range,
  // I will use multi-replace on the file to add import and update component.
  // Wait, I am using replace_file_content on a function. I should use multi_replace to handle import too.

  // Implementation details for this function:
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
  const { currentBranch, logout, isCashier } = useBranch();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const { products, categories: activeCategories, reduceStock } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Printer Context
  const { printReceipt, isConnected } = usePrinter();

  // Employee Context
  const { activeEmployee } = useEmployee();

  // Product Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  // Shift State
  const { isShiftOpen, shiftData, addTransaction, addExpense, isLoading } =
    useShift();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<"open" | "close">(
    "open",
  );

  // Force Open Shift logic removed as per request
  // useEffect(() => {
  //   if (!isLoading && !isShiftOpen) {
  //     setShiftModalMode("open");
  //     setIsShiftModalOpen(true);
  //   }
  // }, [isShiftOpen, isLoading]);

  const handleOpenShiftModal = () => {
    setShiftModalMode("close"); // Trigger close shift manually
    setIsShiftModalOpen(true);
  };

  // Transaction Context for Syncing
  const { addExpense: addTransactionExpense } = useTransactions();

  const handleConfirmCashOut = (amount: number, description: string) => {
    // 1. Add to Shift Data (Local Cashier State)
    addExpense(amount, description);

    // 2. Sync to Global Transaction Data (Admin Report)
    addTransactionExpense({
      branchId: currentBranch?.id || "unknown",
      branchName: currentBranch?.name || "Unknown Branch",
      category: "Operasional", // Default category for Quick Cash Out
      description: description,
      amount: amount,
      recordedBy: activeEmployee?.name || "Kasir",
    });
  };

  const handleAddToCart = (product: Product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // If only 1 variant, might still want to select it or auto-select.
      // logic: if multiple variants, show modal.
      if (product.variants.length === 1) {
        handleConfirmAddToCart(product, product.variants[0]);
      } else {
        setSelectedProduct(product);
        setIsSizeModalOpen(true);
      }
    } else {
      // No variants (single price product)
      // Construct a dummy "Standard" variant for consistency in CartItem
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

      // Destructure to remove variants array from cart item (avoid data duplication/types issue)
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
        // If variantName is provided, match by it. Otherwise fallback to ID only (legacy safe).
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
    console.log("Payment Confirmed:", {
      method: paymentMethod,
      amount: amountPaid,
      items: cartItems,
      total: totalPrice,
    });

    // Construct Transaction Object
    const now = new Date();
    const transactionId = `TRX-${String(
      (shiftData?.transactions?.length || 0) + 1,
    ).padStart(6, "0")}`;
    const transactionTime = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const transactionDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const newTransaction = {
      id: transactionId,
      date: transactionDate,
      time: transactionTime,
      total: totalPrice,
      paymentMethod: paymentMethod,
      status: "completed" as const,
      items: cartItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.variant.price,
        quantity: item.quantity,
        variant: item.variant.name,
      })),
      // Employee attribution
      employeeId: activeEmployee?.id,
      employeeName: activeEmployee?.name,
      // Branch and cashier data for receipt
      branchName: currentBranch?.name || "Cabang Bestea",
      cashierName: activeEmployee?.name || "Kasir",
    };

    // Log transaction to Shift System
    addTransaction(newTransaction);

    // Reduce stock for each product in cart
    for (const item of cartItems) {
      await reduceStock(item.id, item.quantity);
    }

    // Auto Print Receipt if Connected
    if (isConnected) {
      await printReceipt(newTransaction);
    }
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setCartItems([]); // Clear cart on success/close if confirmed
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

  const currentOrderNumber = `Order #${String(
    (shiftData?.transactions?.length || 0) + 1,
  ).padStart(4, "0")}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 rounded-lg border border-slate-200 relative">
      {/* Shift Closed Overlay */}
      {!isShiftOpen && !isLoading && (
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
              categories={activeCategories}
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
