"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ShoppingCart } from "lucide-react";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, Search, FileX } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTransactions } from "@/app/context/transaction-context";
import { useBranch } from "@/contexts/branch-context";

export default function RiwayatPage() {
  const { branches } = useBranch();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState("Hari Ini");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { getTransactionsByBranch } = useTransactions();
  const transactions = getTransactionsByBranch(selectedBranch);

  // Date Filtering Helper
  const isDateInRange = (dateString: string, range: string) => {
    const d = new Date(dateString);
    const now = new Date();

    // Normalize to start of day for accurate comparison
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === "Hari Ini") {
      return targetDate.getTime() === today.getTime();
    }

    if (range === "Kemarin") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return targetDate.getTime() === yesterday.getTime();
    }

    if (range === "Minggu Ini") {
      // Get Monday of current week
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return targetDate >= monday;
    }

    if (range === "Bulan Ini") {
      return (
        targetDate.getMonth() === today.getMonth() &&
        targetDate.getFullYear() === today.getFullYear()
      );
    }

    return true; // Default show all if unknown range (or "Semua")
  };

  const filteredTransactions = transactions.filter((trx) => {
    const matchesBranch =
      selectedBranch === "all" ||
      trx.branchName === branches.find((b) => b.id === selectedBranch)?.name ||
      trx.branchId === selectedBranch;

    const matchesSearch =
      (trx.transactionCode &&
        trx.transactionCode
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      trx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trx.cashierName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = isDateInRange(trx.date, dateRange);

    return matchesBranch && matchesSearch && matchesDate;
  });

  // Calculate Total Amount
  const totalAmount = filteredTransactions
    .filter((t) => t.status === "completed")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Helper to get selected branch name for display
  const getBranchDisplayName = () => {
    if (selectedBranch === "all") return "Semua Cabang";
    const branch = branches.find((b) => b.id === selectedBranch);
    return branch ? branch.name : selectedBranch; // Fallback to ID if not found, but name preferred
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    endIndex,
  );

  // Export handler
  const handleExport = () => {
    const headers = [
      "No. Struk",
      "Waktu",
      "Cabang",
      "Kasir",
      "Metode Bayar",
      "Status",
      "Total",
    ];
    const rows = filteredTransactions.map((trx) => [
      trx.transactionCode || trx.id,
      new Date(trx.date).toLocaleString("id-ID"),
      trx.branchName,
      trx.cashierName,
      trx.paymentMethod,
      trx.status === "completed" ? "Berhasil" : "Batal",
      trx.totalAmount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `riwayat-penjualan-${dateRange}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Riwayat Penjualan
          </h1>
          <p className="text-muted-foreground">
            Rekap transaksi penjualan dari Kasir
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Pendapatan
            </CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatRupiah(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange} • {getBranchDisplayName()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Transaksi
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {
                filteredTransactions.filter((t) => t.status === "completed")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">Order selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari No. Struk / Kasir..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Pilih Cabang" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="Hari Ini">Hari Ini</SelectItem>
              <SelectItem value="Kemarin">Kemarin</SelectItem>
              <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
              <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Struk</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Metode Bayar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((trx) => (
                <TableRow key={trx.id}>
                  <TableCell className="font-medium">
                    {trx.transactionCode || trx.id}
                  </TableCell>
                  <TableCell>
                    {new Date(trx.date).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>{trx.branchName}</TableCell>
                  <TableCell>{trx.cashierName}</TableCell>
                  <TableCell>{trx.paymentMethod}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trx.status === "completed" ? "outline" : "destructive"
                      }
                      className={
                        trx.status === "completed"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {trx.status === "completed" ? "Berhasil" : "Batal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatRupiah(trx.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileX className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium">
                      Tidak ada transaksi ditemukan
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Coba ubah filter atau kata kunci pencarian
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {startIndex + 1}-
            {Math.min(endIndex, filteredTransactions.length)} dari{" "}
            {filteredTransactions.length} transaksi
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* Simple logic for now: show current page */}
              <PaginationItem>
                <PaginationLink isActive>{currentPage}</PaginationLink>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
