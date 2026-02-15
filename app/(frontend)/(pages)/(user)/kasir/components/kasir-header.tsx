import { Button } from "@/components/ui/button";
import { User, WalletCards, Lock } from "lucide-react";
import { SyncStatus } from "@/components/sync-status";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { TransactionHistory } from "./transaction-history";
import { memo } from "react";
import { ShiftData } from "../context/shift-context";
import { Branch, Employee } from "@/contexts/branch-context";
import { PrinterSettingsModal } from "./printer-settings-modal";
import { ConnectPrinterButton } from "./connect-printer-button";

interface KasirHeaderProps {
  branch: Branch | null;
  activeEmployee: Employee | null;
  isShiftOpen: boolean;
  shiftData: ShiftData | null;
  onOpenShiftModal: () => void;
  onOpenCashOut: () => void;
  transactions: any[]; // Using any[] for simplicity as exact type depends on context match
  expenses: any[];
}

export const KasirHeader = memo(function KasirHeader({
  branch,
  activeEmployee,
  isShiftOpen,
  shiftData,
  onOpenShiftModal,
  onOpenCashOut,
  transactions,
  expenses,
}: KasirHeaderProps) {
  return (
    <div className="p-4 md:p-6 pb-0">
      <header className="mb-4 md:mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {branch?.name || "Kasir"}
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
          <SyncStatus />
          <InstallPrompt />
          <ConnectPrinterButton />

          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

          <Button
            variant="ghost"
            size="sm"
            className="flex gap-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9 border border-slate-200 shadow-sm bg-white"
            onClick={onOpenCashOut}
            title="Catat Pengeluaran"
          >
            <WalletCards className="h-4 w-4 text-orange-500" />
            <span className="hidden lg:inline text-xs font-medium">
              Pengeluaran
            </span>
          </Button>

          <TransactionHistory transactions={transactions} expenses={expenses} />

          {isShiftOpen && (
            <Button
              variant="ghost"
              size="sm"
              className="flex gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 h-9 ml-auto sm:ml-0 border border-slate-200 shadow-sm bg-white"
              onClick={onOpenShiftModal}
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
    </div>
  );
});
