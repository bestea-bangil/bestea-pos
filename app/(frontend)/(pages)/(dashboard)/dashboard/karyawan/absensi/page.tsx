"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarIcon, Download, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { id } from "date-fns/locale/id";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

import { useEmployee } from "@/app/context/employee-context";
import { AttendanceRecord } from "@/app/context/employee-context";

const statusConfig: Record<string, { label: string; className: string }> = {
  Hadir: { label: "Hadir", className: "bg-green-100 text-green-700" },
  Terlambat: { label: "Terlambat", className: "bg-yellow-100 text-yellow-700" },
  Alpha: { label: "Alpa", className: "bg-red-100 text-red-700" },
  Sakit: { label: "Sakit", className: "bg-blue-100 text-blue-700" },
  Izin: { label: "Izin/Cuti", className: "bg-purple-100 text-purple-700" },
  // Backward compatibility
  present: { label: "Hadir", className: "bg-green-100 text-green-700" },
  late: { label: "Terlambat", className: "bg-yellow-100 text-yellow-700" },
  absent: { label: "Alpa", className: "bg-red-100 text-red-700" },
  sick: { label: "Sakit", className: "bg-blue-100 text-blue-700" },
  leave: { label: "Izin/Cuti", className: "bg-purple-100 text-purple-700" },
};

export default function AdminAbsensiPage() {
  const {
    attendanceRecords,
    addAttendanceManual,
    employees: allEmployees,
  } = useEmployee();
  // Filter out Super Admin and Admin Cabang - only show Kasir
  const employees = allEmployees.filter((e) => e.role === "Kasir");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Manual Input State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [leaveType, setLeaveType] = useState<
    "sick" | "leave" | "absent" | "present" | "late"
  >("sick");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());

  const handleManualInput = () => {
    if (!selectedEmployeeName || !startDate) {
      toast.error("Harap lengkapi semua data");
      return;
    }

    const emp = employees.find((e) => e.name === selectedEmployeeName);
    if (!emp) {
      toast.error("Karyawan tidak ditemukan");
      return;
    }

    let statusMapped: "Hadir" | "Sakit" | "Izin" | "Alpha" = "Hadir";
    if (leaveType === "sick") statusMapped = "Sakit";
    else if (leaveType === "leave") statusMapped = "Izin";
    else if (leaveType === "absent") statusMapped = "Alpha";

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now().toString().slice(-3)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      // @ts-ignore
      role: emp.role || "Staff",
      date: startDate.toISOString(),
      checkIn: statusMapped === "Hadir" ? "08:00" : "-",
      checkOut: "-",
      status: statusMapped,
      shift: "Pagi",
      branch: emp.branch,
    };

    addAttendanceManual(newRecord);

    setIsModalOpen(false);
    toast.success("Absensi manual berhasil dicatat", {
      description: `${selectedEmployeeName} status: ${statusMapped}`,
    });

    // Reset Form
    setSelectedEmployeeName("");
    setLeaveType("sick");
    setReason("");
  };

  // Combine Employees with Attendance for the selected Date
  const dailyAttendanceData = employees.map((emp) => {
    const selectedDateStr = date
      ? format(date, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");

    // Find record for this employee on this specific date
    const record = attendanceRecords.find(
      (r) =>
        r.employeeId === emp.id &&
        format(new Date(r.date), "yyyy-MM-dd") === selectedDateStr,
    );

    if (record) {
      return {
        ...record,
        isPresent: true,
      };
    }

    // Ghost Record (Belum Hadir)
    return {
      id: `GHOST-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role || "Staff",
      branch: emp.branch,
      date: date ? date.toISOString() : new Date().toISOString(),
      shift: "-", // Shift info not available unless scheduled
      checkIn: "-",
      checkOut: "-",
      status: "absent" as const, // Default to absent visual, but we render "Belum Hadir"
      isPresent: false,
    };
  });

  const filteredData = dailyAttendanceData.filter((item) => {
    const matchSearch =
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter logic
    if (statusFilter === "all") return matchSearch;
    if (statusFilter === "absent_system" && !item.isPresent) return matchSearch; // Special filter for "Belum Hadir"
    if (!item.isPresent) return false; // If filtering by specific status, hide "Belum Hadir" ghosts unless logic updated

    return matchSearch && (item as any).status === statusFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Export handler
  const handleExport = () => {
    const headers = [
      "Nama",
      "Role",
      "Cabang",
      "Tanggal",
      "Shift",
      "Jam Masuk",
      "Jam Pulang",
      "Status",
    ];
    const rows = filteredData.map((item) => [
      item.employeeName,
      // @ts-ignore
      item.role || "-",
      item.branch,
      format(new Date(item.date), "dd/MM/yyyy"),
      item.shift,
      item.checkIn,
      item.checkOut,
      statusConfig[item.status]?.label || item.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `absensi-${date ? format(date, "dd-MM-yyyy") : "all"}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export berhasil", {
      description: `${filteredData.length} data absensi telah diexport.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Absensi</h1>
          <p className="text-muted-foreground">
            Laporan kehadiran karyawan di semua cabang
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Input Izin/Sakit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Input Absensi Manual</DialogTitle>
                <DialogDescription>
                  Gunakan ini untuk mencatat Izin, Sakit, atau Cuti karyawan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee">Pilih Karyawan</Label>
                  <Select
                    value={selectedEmployeeName}
                    onValueChange={setSelectedEmployeeName}
                  >
                    <SelectTrigger id="employee" className="w-full">
                      <SelectValue placeholder="Pilih Karyawan" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.name}>
                          {emp.name} ({emp.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipe Absensi</Label>
                    <Select
                      value={leaveType}
                      onValueChange={(val: any) => setLeaveType(val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="sick">Sakit</SelectItem>
                        <SelectItem value="leave">Izin/Cuti</SelectItem>
                        <SelectItem value="absent">Alpa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tanggal</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {startDate ? format(startDate, "dd/MM/yy") : "Pilih"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reason">Alasan/Keterangan</Label>
                  <Textarea
                    id="reason"
                    placeholder="Contoh: Demam, Keperluan Keluarga..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleManualInput}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Simpan Absensi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
          <CardDescription>
            Tampilkan data absensi berdasarkan tanggal, nama, atau status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama karyawan atau cabang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full sm:w-[240px] justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, "PPP", { locale: id })
                    ) : (
                      <span>Pilih Tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status Kehadiran" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="absent_system">Belum Hadir</SelectItem>
                  <SelectItem value="present">Hadir</SelectItem>
                  <SelectItem value="late">Terlambat</SelectItem>
                  <SelectItem value="sick">Sakit</SelectItem>
                  <SelectItem value="leave">Izin/Cuti</SelectItem>
                  <SelectItem value="absent">Alpa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead className="text-center">Tanggal</TableHead>
                <TableHead className="text-center">Shift</TableHead>
                <TableHead className="text-center">Jam Masuk</TableHead>
                <TableHead className="text-center">Jam Pulang</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.employeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {/* @ts-ignore */}
                          {item.role || "Staff"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.branch}</TableCell>
                    <TableCell className="text-center">
                      {format(new Date(item.date), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground italic">
                      {item.shift}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.checkIn}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.checkOut}
                    </TableCell>
                    <TableCell className="text-center">
                      {!item.isPresent ? (
                        <Badge
                          variant="outline"
                          className="w-24 justify-center bg-slate-100 text-slate-500 border-dashed"
                        >
                          Belum Hadir
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`w-24 justify-center ${
                            statusConfig[item.status]?.className ||
                            "bg-slate-100"
                          }`}
                        >
                          {statusConfig[item.status]?.label || item.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Tidak ada data absensi ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-
              {Math.min(endIndex, filteredData.length)} dari{" "}
              {filteredData.length} data
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
      </Card>
    </div>
  );
}
