"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { useEmployee, PayrollRecord } from "@/app/context/employee-context";

const MONTH_MAP: Record<string, string> = {
  Januari: "01-2024",
  Februari: "02-2024",
  Maret: "03-2024",
};

export default function PayrollPage() {
  const {
    employees: allEmployees,
    payrollRecords,
    markPayrollPaid,
    addPayroll,
  } = useEmployee();
  // Filter out Super Admin and Admin Cabang - only show Kasir
  const employees = allEmployees.filter((e) => e.role === "Kasir");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("Januari");

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Combine Employee Data with Payroll Records
  const payrollViewData = employees.map((emp) => {
    const monthKey = MONTH_MAP[monthFilter] || "01-2024";
    // Find existing payroll record for this employee and month
    const existingRecord = payrollRecords.find(
      (p) => p.employeeId === emp.id && p.month === monthKey,
    );

    if (existingRecord) {
      return {
        ...existingRecord,
        name: existingRecord.employeeName, // Normalize name field
        isDraft: false,
      };
    }

    // Default Calculation (Draft)
    const hours = 160; // Mock default
    const totalHourly = hours * (emp.hourlyRate || 0);
    const totalSalary = (emp.baseSalary || 0) + totalHourly;

    return {
      id: `DRAFT-${emp.id}-${monthKey}`,
      employeeId: emp.id,
      name: emp.name,
      role: emp.role || "Staff",
      month: monthKey,
      hoursWorked: hours,
      baseSalary: emp.baseSalary || 0,
      hourlyRate: emp.hourlyRate || 0,
      totalSalary,
      totalHourly, // Add for view
      status: "Draft" as const, // explicitly 'Draft'
      isDraft: true,
    };
  });

  const handlePay = (item: (typeof payrollViewData)[0]) => {
    if (item.status === "Paid") return;

    if (item.isDraft) {
      // Create new record
      const newRecord: PayrollRecord = {
        id: `PAY-${Date.now()}`,
        employeeId: item.employeeId,
        employeeName: item.name,
        role: item.role,
        month: item.month,
        hoursWorked: item.hoursWorked,
        baseSalary: item.baseSalary,
        hourlyRate: item.hourlyRate,
        totalSalary: item.totalSalary,
        status: "Paid",
      };
      addPayroll(newRecord);
    } else {
      // Update existing record
      markPayrollPaid(item.id);
    }

    toast.success("Gaji Berhasil Dibayarkan", {
      description: `Status payroll ${item.name} telah diperbarui menjadi Paid.`,
    });
  };

  const filteredPayroll = payrollViewData.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Export handler
  const handleExport = () => {
    const headers = [
      "Nama",
      "Role",
      "Jam Kerja",
      "Gaji Pokok",
      "Total Diterima",
      "Status",
    ];
    const rows = filteredPayroll.map((p) => [
      p.name,
      p.role,
      p.hoursWorked.toString(),
      p.baseSalary.toString(),
      p.totalSalary.toString(),
      p.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll-${monthFilter}-2024.csv`);
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
            Rekapitulasi jam kerja dan perhitungan gaji karyawan
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
                payrollViewData.reduce((acc, p) => acc + p.totalSalary, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Periode {monthFilter} 2024
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Jam Kerja
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollViewData.reduce((acc, p) => acc + p.hoursWorked, 0)} Jam
            </div>
            <p className="text-xs text-muted-foreground">
              Rata-rata {Math.round(160)} jam/karyawan
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Trend Pengeluaran
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2.4%</div>
            <p className="text-xs text-muted-foreground">Dari bulan Desember</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rincian Gaji</CardTitle>
              <CardDescription>
                Detail perhitungan gaji berdasarkan jam kerja
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
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Januari">Januari</SelectItem>
                  <SelectItem value="Februari">Februari</SelectItem>
                  <SelectItem value="Maret">Maret</SelectItem>
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
                <TableHead className="text-center">Jam Kerja</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                {/* <TableHead>Total Jam (Rp)</TableHead> */}
                <TableHead className="text-right">Total Diterima</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {p.hoursWorked}h
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(p.baseSalary)}
                  </TableCell>
                  {/* <TableCell className="text-sm">
                    {formatCurrency(p.totalHourly || 0)}
                  </TableCell> */}
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(p.totalSalary)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        p.status === "Paid"
                          ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
