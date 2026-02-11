"use client";

import React, { useState } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Wallet,
  Clock,
  TrendingUp,
  Search,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useBranch } from "@/contexts/branch-context";

// Extended employee with payroll fields (from API)
interface PayrollEmployee {
  id: string;
  name: string;
  role: string;
  branch: string;
  baseSalary?: number;
  hourlyRate?: number;
}

// PayrollRecord for local state
interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  hoursWorked: number;
  baseSalary: number;
  hourlyRate: number;
  totalSalary: number;
  status: "Draft" | "Paid";
  paidAt?: string | null;
  attendanceDays?: number;
  scheduledDays?: number;
  absences?: number;
  deductionAmount?: number;
  excusedDays?: number;
  alphaDays?: number;
  totalDeduction?: number;
}

const MONTH_MAP: Record<string, string> = {
  Januari: "01-2024",
  Februari: "02-2024",
  Maret: "03-2024",
};

export default function PayrollPage() {
  const { currentBranch } = useBranch();
  const [payrollRecords, setPayrollRecords] = React.useState<PayrollRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // State for recalculation dialog
  const [recalculateItem, setRecalculateItem] = useState<PayrollRecord | null>(
    null,
  );
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Default to current month
  const currentMonthIndex = new Date().getMonth(); // 0-11
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const [monthFilter, setMonthFilter] = useState(monthNames[currentMonthIndex]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const currentYear = new Date().getFullYear();

  // Fetch Payroll Data
  const fetchPayroll = React.useCallback(async () => {
    if (!currentBranch) return;

    setIsLoading(true);
    try {
      // Convert Month Name to MM-YYYY
      const monthIndex = monthNames.indexOf(monthFilter);
      const monthStr = String(monthIndex + 1).padStart(2, "0");
      const monthQuery = `${monthStr}-${currentYear}`;

      // Admin sees ALL employees from all branches
      const branchIdParam =
        currentBranch.type === "admin" ? "" : `&branch_id=${currentBranch.id}`;

      const res = await fetch(
        `/api/payroll?month=${monthQuery}${branchIdParam}`,
      );
      if (!res.ok) throw new Error("Failed to fetch payroll");

      const data = await res.json();
      setPayrollRecords(data);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      toast.error("Gagal memuat data payroll");
    } finally {
      setIsLoading(false);
    }
  }, [currentBranch, monthFilter, currentYear]);

  // Initial Fetch
  React.useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handlePay = async (item: PayrollRecord) => {
    if (item.status === "Paid") return;

    try {
      toast.loading("Memproses pembayaran...", { id: "pay-process" });

      // Calculate MM-YYYY
      const monthIndex = monthNames.indexOf(monthFilter);
      const monthStr = String(monthIndex + 1).padStart(2, "0");
      const monthQuery = `${monthStr}-${currentYear}`;

      const payload = {
        employeeId: item.employeeId,
        month: monthQuery,
        hoursWorked: item.hoursWorked,
        baseSalary: item.baseSalary,
        hourlyRate: item.hourlyRate,
        totalSalary: item.totalSalary,
        status: "Paid",
        paidAt: new Date().toISOString(),
        // Breakdown snapshot fields
        attendanceDays: item.attendanceDays,
        excusedDays: item.excusedDays,
        alphaDays: item.alphaDays,
        scheduledDays: item.scheduledDays,
        totalDeduction: item.totalDeduction,
      };

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to process payment");

      toast.dismiss("pay-process");
      toast.success("Gaji Berhasil Dibayarkan", {
        description: `Status payroll ${item.employeeName} telah diperbarui menjadi Paid.`,
      });

      // Refresh data
      fetchPayroll();
    } catch (error) {
      toast.dismiss("pay-process");
      console.error("Payment error:", error);
      toast.error("Gagal memproses pembayaran");
    }
  };

  const handleRecalculate = async () => {
    if (!recalculateItem) return;

    setIsRecalculating(true);
    try {
      const monthIndex = monthNames.indexOf(monthFilter);
      const monthStr = String(monthIndex + 1).padStart(2, "0");
      const monthQuery = `${monthStr}-${currentYear}`;

      const res = await fetch(
        `/api/payroll?id=${recalculateItem.id}&employee_id=${recalculateItem.employeeId}&month=${monthQuery}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        toast.success("Data berhasil direset. Mengambil data terbaru...");
        setRecalculateItem(null); // Close dialog
        fetchPayroll();
      } else {
        throw new Error("Gagal reset data");
      }
    } catch (e) {
      toast.error("Gagal menghitung ulang");
      console.error(e);
    } finally {
      setIsRecalculating(false);
    }
  };

  const filteredPayroll = payrollRecords.filter((p) =>
    p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredPayroll.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayroll = filteredPayroll.slice(startIndex, endIndex);

  // Export handler
  const handleExport = () => {
    const headers = [
      "Nama",
      "Role",
      "Hari Kerja",
      "Gaji Pokok",
      "Total Diterima",
      "Status",
      "Tanggal Pembayaran",
    ];
    const rows = filteredPayroll.map((p) => [
      p.employeeName,
      p.role,
      p.hoursWorked.toString(),
      p.baseSalary.toString(),
      p.totalSalary.toString(),
      p.status,
      p.paidAt ? formatDate(p.paidAt) : "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll-${monthFilter}-${currentYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export berhasil", {
      description: `${filteredPayroll.length} data payroll telah diexport.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rekap Gaji (Payroll)
          </h1>
          <p className="text-muted-foreground">
            Rekapitulasi hari kerja dan perhitungan gaji karyawan
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payrollRecords.reduce((acc, p) => acc + p.totalSalary, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Periode {monthFilter} {currentYear}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hari Kerja
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRecords.reduce((acc, p) => acc + p.hoursWorked, 0)} Hari
            </div>
            <p className="text-xs text-muted-foreground">
              Total kehadiran aktual
            </p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Trend Pengeluaran
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Data belum tersedia</p>
          </CardContent>
        </Card> */}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rincian Gaji</CardTitle>
              <CardDescription>
                Detail perhitungan gaji berdasarkan absensi aktual
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari karyawan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {monthNames.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-center">Hadir / Jadwal</TableHead>
                <TableHead className="text-center">Absen</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead className="text-right">Total Diterima</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Memuat data payroll...
                  </TableCell>
                </TableRow>
              ) : filteredPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Tidak ada data payroll untuk periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayroll.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">
                          {p.employeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.role}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {p.attendanceDays ?? 0} / {p.scheduledDays ?? "-"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <div className="flex flex-col gap-1 items-center">
                        {(p.alphaDays || 0) > 0 && (
                          <span className="text-red-600 text-xs">
                            {p.alphaDays} Alpha
                          </span>
                        )}
                        {(p.excusedDays || 0) > 0 && (
                          <span className="text-yellow-600 text-xs">
                            {p.excusedDays} Izin/Sakit
                          </span>
                        )}
                        {(p.alphaDays || 0) === 0 &&
                          (p.excusedDays || 0) === 0 &&
                          "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(p.baseSalary)}
                    </TableCell>
                    <TableCell className="text-sm text-red-600">
                      {(p.totalDeduction ?? 0) > 0
                        ? `- ${formatCurrency(p.totalDeduction!)}`
                        : "Rp 0"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatCurrency(p.totalSalary)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          p.status === "Paid"
                            ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePay(p)}
                            disabled={p.status === "Paid"}
                            className={
                              p.status === "Paid"
                                ? "opacity-50 cursor-not-allowed"
                                : "text-green-600"
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                          {p.status !== "Paid" && (
                            <DropdownMenuItem
                              onClick={() => setRecalculateItem(p)}
                              className="text-red-600 cursor-pointer"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Hitung Ulang
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {filteredPayroll.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-
              {Math.min(endIndex, filteredPayroll.length)} dari{" "}
              {filteredPayroll.length} data
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
      </Card>

      <AlertDialog
        open={!!recalculateItem}
        onOpenChange={(open) => !open && setRecalculateItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hitung Ulang Gaji?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus data draft saat ini untuk{" "}
              <strong>{recalculateItem?.employeeName}</strong> dan menghitung
              ulang berdasarkan data absensi terbaru.
              <br />
              <br />
              Pastikan absensi karyawan sudah lengkap sebelum melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRecalculating}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRecalculate();
              }}
              disabled={isRecalculating}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isRecalculating ? "Memproses..." : "Hitung Ulang"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
