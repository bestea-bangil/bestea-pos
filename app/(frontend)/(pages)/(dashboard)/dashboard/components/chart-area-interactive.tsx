"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/contexts/branch-context";

export const description = "Grafik Penjualan Interaktif";

const chartConfig = {
  penjualan: {
    label: "Penjualan",
  },
  tunai: {
    label: "Tunai",
    color: "var(--chart-1)",
  },
  qris: {
    label: "QRIS",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface ChartEntry {
  date: string;
  tunai: number;
  qris: number;
}

export function ChartAreaInteractive() {
  const { currentBranch, isSuperAdmin } = useBranch();
  const [timeRange, setTimeRange] = React.useState("30d");
  const [chartData, setChartData] = React.useState<ChartEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ period: timeRange });
        // Super admin sees all branches — don't filter by HQ branch
        if (currentBranch?.id && !isSuperAdmin) {
          params.append("branchId", currentBranch.id);
        }

        const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const json = await res.json();
        if (!cancelled) {
          setChartData(json.chartData || []);
        }
      } catch (err) {
        console.error("Chart fetch error:", err);
        if (!cancelled) setChartData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [timeRange, currentBranch, isSuperAdmin]);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Grafik Penjualan</CardTitle>
          <CardDescription>
            Performa penjualan berdasarkan metode pembayaran
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Pilih rentang waktu"
          >
            <SelectValue placeholder="30 hari terakhir" />
          </SelectTrigger>
          <SelectContent className="rounded-xl" position="popper">
            <SelectItem value="30d" className="rounded-lg">
              30 hari terakhir
            </SelectItem>
            <SelectItem value="14d" className="rounded-lg">
              14 hari terakhir
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              7 hari terakhir
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <p className="animate-pulse text-muted-foreground">
              Memuat data...
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            Belum ada data transaksi
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillTunai" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-tunai)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-tunai)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillQris" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-qris)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-qris)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value + "T00:00:00");
                  return date.toLocaleDateString("id-ID", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        },
                      );
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="qris"
                type="natural"
                fill="url(#fillQris)"
                stroke="var(--color-qris)"
                stackId="a"
              />
              <Area
                dataKey="tunai"
                type="natural"
                fill="url(#fillTunai)"
                stroke="var(--color-tunai)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
