"use client";

import { useSync } from "@/contexts/sync-context";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Wifi, WifiOff, CloudUpload } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncStatus() {
  const { isOnline, isSyncing, pendingCount, triggerSync, lastSynced } =
    useSync();

  const handleSync = async () => {
    await triggerSync();
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isOnline
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {isOnline ? "Online" : "Mode Lokal"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isOnline
                ? "Terhubung ke internet"
                : "Tidak ada koneksi internet"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sync Button - Always Visible but Disabled if Syncing or No Pending Items */}
      <Button
        variant="outline"
        size="sm"
        className={`h-9 gap-2 border-slate-200 shadow-sm ${
          pendingCount > 0
            ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
            : "bg-white text-slate-700"
        }`}
        onClick={handleSync}
        disabled={isSyncing || pendingCount === 0}
        title={
          pendingCount > 0
            ? `${pendingCount} data belum disinkronkan`
            : "Tidak ada data pending"
        }
      >
        <div className={`relative ${isSyncing ? "animate-spin" : ""}`}>
          <RefreshCcw className="h-3.5 w-3.5" />
        </div>
        <span className="hidden lg:inline text-xs font-medium">
          {isSyncing ? "Sinkronisasi..." : "Sync"}
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center justify-center bg-orange-500 text-white text-[10px] h-5 w-5 rounded-full ml-1 font-bold">
            {pendingCount}
          </span>
        )}
      </Button>
    </div>
  );
}
