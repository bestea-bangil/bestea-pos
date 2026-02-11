"use client";

import { useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Service Worker handled by @ducanh2912/next-pwa automatically

  return (
    <AuthGuard allowedRoles={["cashier", "super_admin"]}>
      <div className="min-h-screen bg-slate-50">{children}</div>
    </AuthGuard>
  );
}
