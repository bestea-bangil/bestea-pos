"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

// Static data removed

import { useTransactions } from "@/app/context/transaction-context";

export function RecentSales() {
  const { transactions } = useTransactions();

  // Get latest 5 completed transactions
  const recentSales = transactions
    .filter((t) => t.status === "completed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((t) => ({
      order: t.id,
      name:
        t.items
          .map((i) => i.productName)
          .join(", ")
          .slice(0, 30) + (t.items.length > 1 ? "..." : ""),
      method: t.paymentMethod,
      amount: t.totalAmount,
    }));

  return (
    <Card className="col-span-4 lg:col-span-3 flex flex-col max-h-[440px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base md:text-lg">
          Transaksi Terakhir
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          5 transaksi terbaru dari kasir.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Order</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">
                Metode
              </TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <TableRow key={sale.order}>
                  <TableCell className="py-2">
                    <div className="font-medium text-xs md:text-sm">
                      {sale.order}
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground">
                      {sale.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 hidden sm:table-cell">
                    <span className="text-xs uppercase">{sale.method}</span>
                  </TableCell>
                  <TableCell className="py-2 text-right font-bold text-xs md:text-sm">
                    {formatter.format(sale.amount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-8 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm">Belum ada transaksi</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
