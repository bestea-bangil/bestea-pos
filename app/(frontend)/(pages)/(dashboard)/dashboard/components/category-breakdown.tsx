"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransactions } from "@/app/context/transaction-context";

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

const COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
];

export function CategoryBreakdown() {
  const { getBranchPerformance } = useTransactions();
  const branchBreakdown = getBranchPerformance().map((b, i) => ({
    ...b,
    color: COLORS[i % COLORS.length],
  }));
  const totalRevenue = branchBreakdown.reduce((acc, b) => acc + b.revenue, 0);
  const hasData = branchBreakdown.length > 0 && totalRevenue > 0;

  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg">Cabang Terlaris</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Breakdown penjualan berdasarkan cabang.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasData ? (
          branchBreakdown.map((item) => (
            <div key={item.branch} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="font-medium">{item.branch}</span>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="text-muted-foreground text-xs">
                    {item.percentage}%
                  </span>
                  <span className="font-bold w-20 md:w-24 text-right text-xs md:text-sm">
                    {formatter.format(item.revenue)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <span className="text-sm">Belum ada data penjualan</span>
          </div>
        )}

        <div className="pt-3 border-t mt-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground text-xs md:text-sm">
              Total Pendapatan
            </span>
            <span className="text-lg md:text-xl font-bold">
              {formatter.format(totalRevenue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
