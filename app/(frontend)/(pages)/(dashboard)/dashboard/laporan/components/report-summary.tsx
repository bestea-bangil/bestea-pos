import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { CopySlash, DollarSign, TrendingUp, Wallet } from "lucide-react";

interface SummaryProps {
  omzet: number;
  expenses: number;
}

export function ReportSummary({ omzet, expenses }: SummaryProps) {
  const profit = omzet - expenses;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Omzet</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatRupiah(omzet)}</div>
          <p className="text-xs text-muted-foreground">Kotor (Gross Sales)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pengeluaran</CardTitle>
          <CopySlash className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatRupiah(expenses)}
          </div>
          <p className="text-xs text-muted-foreground">
            Bahan baku & Operasional
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit Bersih</CardTitle>
          <Wallet className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatRupiah(profit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Omzet dikurangi Pengeluaran
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
