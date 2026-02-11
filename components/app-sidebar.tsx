"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  FileBarChart,
  Settings,
  PackagePlus,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import { useBranch } from "@/contexts/branch-context";

const superAdminNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
      },
    ],
  },
  {
    title: "Produk",
    url: "/dashboard/produk",
    icon: Package,
    items: [
      {
        title: "Daftar Produk",
        url: "/dashboard/produk",
      },
      {
        title: "Kategori",
        url: "/dashboard/produk/kategori",
      },
    ],
  },

  {
    title: "Karyawan",
    url: "/dashboard/karyawan",
    icon: Users,
    items: [
      {
        title: "Daftar Karyawan",
        url: "/dashboard/karyawan",
      },
      {
        title: "Absensi",
        url: "/dashboard/karyawan/absensi",
      },
      {
        title: "Shift",
        url: "/dashboard/karyawan/shift",
      },
      {
        title: "Role",
        url: "/dashboard/karyawan/role",
      },
      {
        title: "Payroll",
        url: "/dashboard/karyawan/payroll",
      },
    ],
  },
  {
    title: "Cabang",
    url: "/dashboard/cabang",
    icon: Building2,
    items: [
      {
        title: "Daftar Cabang",
        url: "/dashboard/cabang",
      },
    ],
  },
  {
    title: "Laporan",
    url: "/dashboard/laporan",
    icon: FileBarChart,
    items: [
      {
        title: "Keuangan",
        url: "/dashboard/laporan",
      },
      {
        title: "Riwayat Penjualan",
        url: "/dashboard/laporan/riwayat",
      },
    ],
  },
  {
    title: "Pengaturan",
    url: "/dashboard/pengaturan/akun",
    icon: Settings,
    items: [
      {
        title: "Akun",
        url: "/dashboard/pengaturan/akun",
      },
    ],
  },
];

const branchAdminNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
      },
    ],
  },

  {
    title: "Laporan",
    url: "/dashboard/laporan",
    icon: FileBarChart,
    items: [
      {
        title: "Penjualan Cabang",
        url: "/dashboard/laporan/penjualan",
      },
      {
        title: "Stok Cabang",
        url: "/dashboard/laporan/stok",
      },
    ],
  },
  {
    title: "Karyawan",
    url: "/dashboard/karyawan",
    icon: Users,
    items: [
      {
        title: "Absensi",
        url: "/dashboard/karyawan/absensi",
      },
      {
        title: "Jadwal Shift",
        url: "/dashboard/karyawan/shift",
      },
    ],
  },
  {
    title: "Pengaturan",
    url: "/dashboard/pengaturan/akun",
    icon: Settings,
    items: [
      {
        title: "Akun",
        url: "/dashboard/pengaturan/akun",
      },
    ],
  },
];

const cashierNavItems = [
  {
    title: "POS Kasir",
    url: "/kasir",
    icon: ShoppingCart,
    isActive: true,
    items: [
      {
        title: "Buka POS",
        url: "/kasir",
      },
    ],
  },
  {
    title: "Produk",
    url: "/dashboard/produk",
    icon: Package,
    items: [
      {
        title: "Cek Stok",
        url: "/dashboard/produk",
      },
    ],
  },
];

// userData will be computed from context in AppSidebar component

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    currentBranch,
    branches,
    setCurrentBranch,
    userRole,
    isSuperAdmin,
    isBranchAdmin,
    isCashier,
    activeEmployee,
  } = useBranch();

  // Compute user data from activeEmployee
  const userData = {
    name: activeEmployee?.name || "User",
    // @ts-ignore - Assuming email might be added or just placeholder
    email: activeEmployee?.email || activeEmployee?.branch || "",
    avatar: activeEmployee?.avatar_url || "",
  };

  // Konversi branches ke format TeamSwitcher
  const teams = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    logo: branch.type === "admin" ? LayoutDashboard : Building2,
    plan: branch.type === "admin" ? "Enterprise" : "Cabang",
  }));

  // Pilih navigasi berdasarkan Role
  let navItems = [];

  if (isSuperAdmin) {
    navItems = superAdminNavItems;
  } else if (isBranchAdmin) {
    navItems = branchAdminNavItems;
  } else if (isCashier) {
    navItems = cashierNavItems;
  } else {
    // Fallback default
    navItems = cashierNavItems;
  }

  // Override jika sedang di context admin tapi bukan superadmin (seharusnya tidak terjadi jika logic benar)
  // Tapi untuk keamanan visual, kita pastikan context admin navigasinya admin
  if (currentBranch?.type === "admin" && !isSuperAdmin) {
    // Jika user non-superadmin masuk ke context admin, mungkin harus dibatasi atau di-redirect
    // Untuk sekarang kita biarkan logic role yang menang
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
