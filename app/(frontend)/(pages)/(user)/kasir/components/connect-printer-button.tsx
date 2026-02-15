"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Check, Settings } from "lucide-react";
import { usePrinter } from "../context/printer-context";
import { PrinterSettingsModal } from "./printer-settings-modal";
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

export function ConnectPrinterButton() {
  const { disconnect, connect, isConnected, isConnecting, deviceName } =
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
