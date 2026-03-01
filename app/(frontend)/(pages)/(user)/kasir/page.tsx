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
import { KasirHeader } from "./components/kasir-header";
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
import { Lock, ShoppingBag } from "lucide-react";
import { PrinterProvider, usePrinter } from "./context/printer-context";
import { PaymentModal } from "./components/payment-modal";
import { ShiftProvider, useShift } from "./context/shift-context";
import { ShiftModal } from "./components/shift-modal";
import { CashOutModal } from "./components/cash-out-modal";
import { SizeSelectionModal } from "./components/size-selection-modal";
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

import { usePOSCheckout } from "./hooks/usePOSCheckout";

function KasirContent() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    products,
    categories,
    isDataLoading,
    currentBranch,
    activeEmployee,
    isSuperAdmin,

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

    isShiftOpen,
    shiftData,
    isShiftLoading,
    totalItems,
    totalPrice,
    currentOrderNumber,

    fetchData,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveItem,
    handleConfirmPayment,
    handleConfirmCashOut,
    handleConfirmAddToCart,
  } = usePOSCheckout();

  const handleOpenShiftModalCallback = useCallback(() => {
    setShiftModalMode("close");
    setIsShiftModalOpen(true);
  }, []);

  const handleOpenCashOut = useCallback(() => {
    setIsCashOutOpen(true);
  }, []);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setCartItems([]);
    fetchData();
  };

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  if (isShiftLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

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
          <KasirHeader
            branch={currentBranch}
            activeEmployee={activeEmployee}
            isShiftOpen={isShiftOpen}
            shiftData={shiftData}
            onOpenShiftModal={handleOpenShiftModalCallback}
            onOpenCashOut={handleOpenCashOut}
            transactions={shiftData?.transactions || []}
            expenses={shiftData?.expenses || []}
          />

          <div className="p-4 md:p-6 pt-0">
            <CategorySelector
              categories={categories}
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
