"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  Activity,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTransactions } from "@/app/context/transaction-context";

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  hasData?: boolean; // Whether there's actual data to show
}

function StatsCard({
  title,
  value,
  change,
  icon,
  hasData = true,
}: StatsCardProps) {
  const isPositive = change >= 0;
  const showChange =
    hasData &&
    (change !== 0 || (value !== "Rp 0" && value !== "0" && value !== 0));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{value}</div>
        {showChange ? (
          <p
            className={`text-xs flex items-center mt-1 ${isPositive ? "text-green-600" : "text-red-500"}`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {isPositive ? "+" : ""}
            {change.toFixed(1)}% dari kemarin
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Belum ada data</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  stats: {
    revenue: number;
    revenueGrowth: number;
    transactionCount: number;
    transactionGrowth: number;
    activeBranches: number;
    productsSold: number;
    productGrowth: number;
  };
  period: string;
}

export function StatsCards({ stats, period }: StatsCardsProps) {
  const getPeriodLabel = (p: string) => {
    switch (p) {
      case "today":
        return "Hari Ini";
      case "yesterday":
        return "Kemarin";
      case "this_week":
        return "Minggu Ini";
      case "this_month":
        return "Bulan Ini";
      case "this_year":
        return "Tahun Ini";
      case "30d":
        return "30 Hari Terakhir";
      default:
        return "Hari Ini";
    }
  };

  const label = getPeriodLabel(period);

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={`Omset ${label}`}
        value={formatter.format(stats.revenue)}
        change={stats.revenueGrowth}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Total Transaksi"
        value={stats.transactionCount.toString()}
        change={stats.transactionGrowth}
        icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Cabang Aktif"
        value={stats.activeBranches}
        change={0}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Produk Terjual"
        value={stats.productsSold.toString()}
        change={stats.productGrowth}
        icon={<Package className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
}
