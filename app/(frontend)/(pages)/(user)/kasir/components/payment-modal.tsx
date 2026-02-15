"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentMethod: "cash" | "qris", amountPaid: number) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  const handleQuickPay = (amount: number) => {
    setAmountPaid(formatNumber(amount.toString()));
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    if (!number) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(number));
  };

  const parseNumber = (value: string) => {
    return parseInt(value.replace(/\./g, "") || "0");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountPaid(formatNumber(e.target.value));
  };

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(formatNumber(total.toString()));
      setIsSuccess(false);
    } else {
      setAmountPaid("");
      setPaymentMethod("cash");
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Recalculate change whenever amountPaid string changes
  useEffect(() => {
    const paid = parseNumber(amountPaid);
    setChange(Math.max(0, paid - total));
  }, [amountPaid, total]);

  const handleConfirm = () => {
    const paid = parseNumber(amountPaid);
    if (paid < total) {
      toast.error("Pembayaran Kurang", {
        description: `Kurang ${formatter.format(total - paid)}`,
      });
      return;
    }
    onConfirm(paymentMethod, paid);
    setIsSuccess(true);
    toast.success("Pembayaran Berhasil");
  };

  const quickAmounts = [total, 5000, 10000, 20000, 50000, 100000]
    .filter((amt) => amt >= total || amt === total)
    .sort((a, b) => a - b);

  // Remove duplicates
  const uniqueQuickAmounts = Array.from(new Set(quickAmounts));

  if (!isOpen) return null;

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="p-10 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  Pembayaran Berhasil!
                </h2>
                <p className="text-slate-500">
                  Transaksi telah berhasil diproses.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg w-full mt-4 border border-slate-100">
                <p className="text-sm text-slate-500">Kembalian</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatter.format(change)}
                </p>
              </div>
              <Button
                type="button"
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-6"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto rounded-t-xl sm:rounded-xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="p-6 bg-slate-900 text-white flex-none">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-green-400" />
            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Checkout
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Total Tagihan</h2>
          <div className="text-2xl md:text-3xl font-black text-green-400 mt-1">
            {formatter.format(total)}
          </div>
        </div>

        <div className="p-6 space-y-6 bg-white flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paymentMethod === "cash" ? "default" : "outline"}
              className={`h-16 flex flex-col gap-1 transition-all ${
                paymentMethod === "cash"
                  ? "bg-slate-900 border-slate-900 hover:bg-slate-900"
                  : "hover:bg-transparent"
              }`}
              onClick={() => setPaymentMethod("cash")}
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs font-semibold">Tunai</span>
            </Button>
            <Button
              variant={paymentMethod === "qris" ? "default" : "outline"}
              className={`h-16 flex flex-col gap-1 transition-all ${
                paymentMethod === "qris"
                  ? "bg-slate-900 border-slate-900 hover:bg-slate-900"
                  : "hover:bg-transparent"
              }`}
              onClick={() => setPaymentMethod("qris")}
            >
              <QrCode className="h-5 w-5" />
              <span className="text-xs font-semibold">QRIS</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="amountPaid"
                className="text-sm font-bold text-slate-700"
              >
                Diterima ({paymentMethod === "qris" ? "QRIS" : "Tunai"})
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  Rp
                </span>
                <Input
                  id="amountPaid"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  className="pl-10 h-12 text-lg font-bold border-2 focus-visible:ring-slate-900"
                  value={amountPaid}
                  onChange={handleAmountChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {uniqueQuickAmounts.map((amt) => {
                const isSelected = parseNumber(amountPaid) === amt;
                return (
                  <Button
                    key={amt}
                    variant="outline"
                    className={`h-10 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-600 hover:text-green-800 ring-1 ring-green-500"
                        : "border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => handleQuickPay(amt)}
                  >
                    {amt === total
                      ? "Pas"
                      : formatter.format(amt).replace("Rp", "").trim()}
                  </Button>
                );
              })}
            </div>

            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                parseNumber(amountPaid) >= total
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">
                  Kembalian
                </span>
                <span
                  className={`text-xl font-black ${
                    parseNumber(amountPaid) >= total
                      ? "text-green-600"
                      : "text-slate-400"
                  }`}
                >
                  {formatter.format(change)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col-reverse sm:flex-row gap-3 sm:space-x-0 flex-none">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-1/3 h-12 sm:h-14 text-base sm:text-lg font-semibold border-slate-200 hover:bg-slate-50 text-slate-700"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="w-full sm:w-2/3 h-12 sm:h-14 text-base sm:text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none"
            disabled={parseNumber(amountPaid) < total || !amountPaid}
            onClick={handleConfirm}
          >
            Selesaikan Pesanan
          </Button>
        </div>
      </div>
    </div>
  );
}
