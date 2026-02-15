"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Capture the event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast("Cara Install di iOS", {
          description:
            "Ketuk tombol Share (kotak dengan panah ke atas) lalu pilih 'Add to Home Screen' (Tambah ke Layar Utama).",
          duration: 6000,
        });
      }
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) return null;

  // Don't show if purely desktop non-installable (unless testing)
  // But for iOS we want to show instructions.
  if (!deferredPrompt && !isIOS) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white text-slate-700"
      onClick={handleInstallClick}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install Aplikasi</span>
      <span className="sm:hidden">Install</span>
    </Button>
  );
}
