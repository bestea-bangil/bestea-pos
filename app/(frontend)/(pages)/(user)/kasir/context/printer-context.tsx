"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  PrinterEncoder,
  PrinterConfig,
  processLogo,
} from "@/app/lib/printer-utils";
import { toast } from "sonner";
import { Transaction } from "../data/mock-data";

// Type definitions for Web Bluetooth API
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(
    service: string | number,
  ): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(
    characteristic: string | number,
  ): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>;
}

// Extend Navigator interface to include bluetooth
declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters?: Array<{ services: string[] | number[] }>;
        optionalServices?: string[] | number[];
        acceptAllDevices?: boolean;
      }): Promise<BluetoothDevice>;
    };
  }
}

export interface PrinterContextType {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  printReceipt: (transaction: Transaction) => Promise<void>;
  error: string | null;
  settings: PrinterConfig;
  updateSettings: (settings: Partial<PrinterConfig>) => void;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
  const [characteristic, setCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PrinterConfig>({
    paperWidth: "58mm",
    charsPerLine: 32,
    chunkSize: 100,
  });

  // Load settings from localStorage
  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("printer-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        } catch (e) {}
      }
    }
  });

  const updateSettings = (newSettings: Partial<PrinterConfig>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // Recalculate chars per line if width changed and no explicit charsPerLine provided
      if (newSettings.paperWidth && !newSettings.charsPerLine) {
        updated.charsPerLine = newSettings.paperWidth === "80mm" ? 48 : 32;
      }
      localStorage.setItem("printer-settings", JSON.stringify(updated));
      return updated;
    });
  };

  // Check if Web Bluetooth is supported (client-side only)
  const isSupported =
    typeof window !== "undefined" &&
    window.navigator &&
    "bluetooth" in window.navigator;

  const connect = async () => {
    if (!isSupported) {
      setError("Web Bluetooth is not supported in this browser.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Request Device
      const selectedDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }], // Standard 18f0 service for printers
        // acceptAllDevices: true, // Fallback if filter fails
        // optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });

      setDevice(selectedDevice);

      // 2. Connect to GATT Server
      if (!selectedDevice.gatt) {
        throw new Error("Device does not support GATT connection");
      }

      const gattServer = await selectedDevice.gatt.connect();
      setServer(gattServer);

      // 3. Get Service and Characteristic
      const service = await gattServer.getPrimaryService(
        "000018f0-0000-1000-8000-00805f9b34fb",
      );
      const outputCharacteristic = await service.getCharacteristic(
        "00002af1-0000-1000-8000-00805f9b34fb",
      );

      setCharacteristic(outputCharacteristic);
      toast.success("Printer terhubung!", {
        description: selectedDevice.name || "Bluetooth Printer",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to connect to printer";
      setError(errorMessage);
      toast.error("Gagal menghubungkan printer", {
        description: errorMessage,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = useCallback(() => {
    if (device && device.gatt && device.gatt.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setServer(null);
    setCharacteristic(null);
  }, [device]);

  const printReceipt = async (transaction: Transaction) => {
    if (!characteristic || !device) {
      setError("Printer not connected");
      toast.error("Printer tidak terhubung", {
        description: "Silakan hubungkan printer terlebih dahulu.",
      });
      return;
    }

    // Use a local variable to track the active characteristic
    let activeCharacteristic = characteristic;

    // Check if GATT is still connected, try to reconnect if not
    if (!device.gatt?.connected) {
      try {
        toast.info("Menghubungkan ulang ke printer...");
        const gattServer = await device.gatt?.connect();
        if (gattServer) {
          setServer(gattServer);
          const service = await gattServer.getPrimaryService(
            "000018f0-0000-1000-8000-00805f9b34fb",
          );
          const outputCharacteristic = await service.getCharacteristic(
            "00002af1-0000-1000-8000-00805f9b34fb",
          );
          setCharacteristic(outputCharacteristic);
          // Use the NEW characteristic for this print operation
          activeCharacteristic = outputCharacteristic;
        }
      } catch (reconnectErr: any) {
        setError("Connection lost. Please reconnect printer.");
        toast.error("Koneksi printer terputus", {
          description: "Silakan hubungkan ulang printer dari tombol Connect.",
        });
        // Reset states
        setDevice(null);
        setServer(null);
        setCharacteristic(null);
        return;
      }
    }

    try {
      const encoder = new PrinterEncoder(settings);

      // Header with Logo text
      encoder.align("center");
      encoder.newline();

      // Logo
      try {
        const logoData = await processLogo("/logo/bestea-logo.png");
        if (logoData) {
          encoder.raw(logoData);
          encoder.newline(2); // Spacing after logo as requested
        } else {
          // Fallback if image fails
          encoder.bold(true);
          encoder.size("large");
          encoder.line("Bestea");
          encoder.size("normal");
          encoder.bold(false);
        }
      } catch (e) {
        encoder.bold(true);
        encoder.size("large");
        encoder.line("Bestea");
        encoder.size("normal");
        encoder.bold(false);
      }

      // Branch Name
      encoder.bold(true);
      encoder.line(transaction.branchName || "Bestea");
      encoder.bold(false);

      // Address & Phone (From image/template)
      encoder.line("Jl. Salem Kersikan Bangil");
      encoder.line("081779677759");
      encoder.newline();

      // Meta: Date Time and Transaction Code
      // Format: 25/9/2025 18:40          #1115
      encoder.align("left");
      const dateStr = `${transaction.date} ${transaction.time || ""}`;
      const codeStr = `${(transaction.transactionCode || transaction.id).slice(-4)}`; // Use last 4 digits for short code style
      encoder.row(dateStr, codeStr);

      // Cashier Name (Requested Addition)
      if (transaction.cashierName) {
        encoder.line(`Kasir: ${transaction.cashierName}`);
      }

      encoder.separator("-");

      // Items List
      // Format:
      // Milk Tiramishu
      //   1x 8.000      8.000
      transaction.items.forEach((item) => {
        encoder.align("left");
        encoder.line(
          `${item.name} ${item.variant ? "(" + item.variant + ")" : ""}`,
        );

        const qtyPrice = `${item.quantity}x ${new Intl.NumberFormat("id-ID").format(item.price)}`;
        const subtotal = new Intl.NumberFormat("id-ID").format(
          item.quantity * item.price,
        );

        encoder.row(qtyPrice, subtotal);
      });

      encoder.separator("-");

      // Summary
      // Produk: [Count]
      // Item: [Total Qty]
      const uniqueItems = transaction.items.length;
      const totalItems = transaction.items.reduce(
        (acc, item) => acc + item.quantity,
        0,
      );

      encoder.align("left");
      encoder.line(`Produk: ${uniqueItems}`);
      encoder.line(`Item: ${totalItems}`);

      encoder.separator("-");

      // Payment
      // Total            Rp48.000
      // Tunai            Rp48.000
      //                     Lunas

      const totalFormatted = `Rp${new Intl.NumberFormat("id-ID").format(transaction.total)}`;
      encoder.row("Total", totalFormatted);

      const paymentMethod =
        transaction.paymentMethod === "qris"
          ? "QRIS"
          : transaction.paymentMethod === "debit"
            ? "Debit"
            : "Tunai";
      // Assuming paid amount matches total for "Lunas" display simplification
      encoder.row(paymentMethod, totalFormatted);

      encoder.align("right");
      encoder.line("Lunas");

      encoder.separator("-");

      // Footer
      encoder.align("center");
      encoder.line("Ikut rekening pak aan(pak said)");
      encoder.separator("-");
      encoder.newline();

      encoder.line("Terima kasih");
      const printTime = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      encoder.line(`Dicetak: ${printTime}`);
      encoder.newline();
      encoder.cut();

      // Send to printer
      const data = encoder.encode();
      const chunkSize = settings.chunkSize || 100;

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await activeCharacteristic.writeValue(chunk);
      }
      toast.success("Struk berhasil dicetak");
    } catch (err: any) {
      const errorMessage = "Printing failed: " + err.message;
      setError(errorMessage);
      toast.error("Gagal mencetak struk", {
        description: err.message,
      });
    }
  };

  return (
    <PrinterContext.Provider
      value={{
        isSupported,
        isConnected: !!(server && server.connected),
        isConnecting,
        deviceName: device?.name || null,
        connect,
        disconnect,
        printReceipt,
        error,
        settings,
        updateSettings,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const context = useContext(PrinterContext);
  if (context === undefined) {
    throw new Error("usePrinter must be used within a PrinterProvider");
  }
  return context;
}
