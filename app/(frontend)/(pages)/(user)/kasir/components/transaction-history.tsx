import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  History,
  Receipt,
  ChevronRight,
  Clock,
  CreditCard,
  X,
  WalletCards,
  ArrowUpRight,
  Loader2,
  User,
} from "lucide-react";
import { Transaction } from "../data/mock-data";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Expense } from "../context/shift-context";
import { usePrinter } from "../context/printer-context";
import { useState } from "react";

interface TransactionHistoryProps {
  transactions: Transaction[];
  expenses: Expense[];
}

export function TransactionHistory({
  transactions,
  expenses,
}: TransactionHistoryProps) {
  const { printReceipt, isConnected } = usePrinter();
  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrint = async (trx: Transaction) => {
    if (!isConnected) {
      return;
    }
    setPrintingId(trx.id);
    try {
      await printReceipt(trx);
    } finally {
      setPrintingId(null);
    }
  };

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex gap-2 rounded-md border border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-700 h-9 bg-white shadow-sm cursor-pointer"
        >
          <History className="h-4 w-4 md:mr-2 text-slate-500" />
          <span className="hidden md:inline cursor-pointer text-xs font-medium">
            Riwayat
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0"
        showCloseButton={false}
      >
        <SheetHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Riwayat
          </SheetTitle>
          <SheetClose asChild>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-red-100 hover:text-red-500 transition-colors">
              <X className="h-4 w-4" />
            </div>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)] p-6 pt-2">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="transactions">Transaksi</TabsTrigger>
              <TabsTrigger value="expenses">Pengeluaran</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
                  <div className="bg-slate-100 p-3 rounded-full">
                    <History className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-600">
                      Belum ada transaksi
                    </p>
                    <p className="text-xs mt-1">
                      Transaksi yang selesai akan muncul di sini.
                    </p>
                  </div>
                </div>
              ) : (
                transactions.map((trx) => (
                  <div
                    key={trx.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-green-500 hover:bg-green-50/50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-green-700 transition-colors">
                          {trx.transactionCode || trx.id}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {trx.time}
                          </span>
                          <span>-</span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />{" "}
                            {trx.paymentMethod === "qris" ? "QRIS" : "Tunai"}
                          </span>
                          {trx.employeeName && (
                            <>
                              <span>-</span>
                              <span className="flex items-center gap-1 text-blue-600">
                                <User className="h-3 w-3" />
                                {trx.employeeName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatter.format(trx.total)}
                        </div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${trx.status === "completed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {trx.status === "completed" ? "Berhasil" : trx.status}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3 opacity-50" />

                    <div className="space-y-1">
                      {trx.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-sm flex justify-between text-slate-600"
                        >
                          <span>
                            {item.quantity}x {item.name}
                            {item.variant && item.variant !== "Standard" && (
                              <span className="text-muted-foreground ml-1 text-xs">
                                ({item.variant})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {trx.items.length > 2 && (
                        <div className="text-xs text-muted-foreground italic">
                          + {trx.items.length - 2} item lainnya
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2 flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => handlePrint(trx)}
                        disabled={!isConnected || printingId === trx.id}
                      >
                        {printingId === trx.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Mencetak...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-3 w-3 mr-2" />
                            Cetak Struk
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
                  <div className="bg-slate-100 p-3 rounded-full">
                    <WalletCards className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-600">
                      Belum ada pengeluaran
                    </p>
                    <p className="text-xs mt-1">
                      Catatan pengeluaran modal akan muncul di sini.
                    </p>
                  </div>
                </div>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="border border-red-100 bg-red-50/30 rounded-lg p-4 hover:border-red-300 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <WalletCards className="h-4 w-4 text-orange-500" />
                          {exp.description}
                        </div>
                        <div className="flex items-center text-xs text-slate-500 mt-1 gap-1">
                          <Clock className="h-3 w-3" /> {exp.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {formatter.format(exp.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {exp.id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
