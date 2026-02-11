"use client";

import { useState, useEffect, useCallback } from "react";
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
import { CalendarIcon, Download, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Pagination,
  PaginationContent,
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
import { useBranch } from "@/contexts/branch-context";
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

// Local Types
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  branch: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpha" | "absent";
  shift: string;
  notes?: string;
  isPresent?: boolean; // For frontend logic
}

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

// Helper to format timestamp to local time (HH:MM)
const formatTime = (timestamp: string | null | undefined): string => {
  if (!timestamp || timestamp === "") return "-";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "-"; // Invalid date
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

export default function AdminAbsensiPage() {
  const { currentBranch } = useBranch();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Manual Input State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<string>("sick");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());

  // Fetch Data (Employees & Attendance)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = date
        ? format(date, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

      // Fetch Employees (to show "Belum Hadir" list)
      const employeesRes = await fetch("/api/employees");
      const employeesData = await employeesRes.json();
      // Filter: Only Cashiers
      const cashiersOnly = employeesData.filter((e: any) => e.role === "Kasir");
      setEmployees(cashiersOnly);

      // Fetch Attendance for selected date
      let url = `/api/attendance?date=${dateStr}`;
      // Optionally filter by branch context if not super admin, but API handles RLS usually or strict filter
      // For now fetch all to allow super admin to see everything

      const attRes = await fetch(url);
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendanceRecords(attData);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("Gagal mengambil data absensi");
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combine Data for View
  const processedData = employees.map((emp) => {
    const record = attendanceRecords.find((r) => r.employeeId === emp.id);

    if (record) {
      return { ...record, isPresent: true };
    }

    // Ghost Record
    return {
      id: `GHOST-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role || "Staff",
      branch: emp.branch || "Unknown",
      date: date ? date.toISOString() : new Date().toISOString(),
      shift: "-",
      checkIn: "-",
      checkOut: "-",
      status: "absent" as const,
      isPresent: false,
    } as AttendanceRecord;
  });

  const filteredData = processedData.filter((item) => {
    const matchSearch =
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    if (roleFilter !== "all" && item.role !== roleFilter) return false;

    // Status filter logic
    if (statusFilter === "all") return matchSearch;
    if (statusFilter === "absent_system" && !item.isPresent) return matchSearch;
    if (!item.isPresent) return false;

    return matchSearch && (item as any).status === statusFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleManualInput = async () => {
    if (!selectedEmployeeId || !startDate) {
      toast.error("Harap lengkapi semua data");
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) {
      toast.error("Karyawan tidak ditemukan");
      return;
    }

    let statusMapped = "Hadir";
    if (leaveType === "sick") statusMapped = "Sakit";
    else if (leaveType === "leave") statusMapped = "Izin";
    else if (leaveType === "absent") statusMapped = "Alpha";

    try {
      // Construct proper timestamp for checkInTime if status is Hadir
      let checkInTimestamp = null;
      if (statusMapped === "Hadir" && startDate) {
        // Create a new Date object from startDate and set time to 08:00
        const dateObj = new Date(startDate);
        dateObj.setHours(8, 0, 0, 0);
        checkInTimestamp = dateObj.toISOString();
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          branchId: emp.branch_id || currentBranch?.id || "",
          date: format(startDate, "yyyy-MM-dd"),
          status: statusMapped,
          shift: "Pagi", // Default
          notes: reason,
          checkInTime: checkInTimestamp,
        }),
      });

      if (res.ok) {
        toast.success("Absensi manual berhasil dicatat");
        setIsModalOpen(false);
        fetchData();
        // Reset
        setSelectedEmployeeId("");
        setLeaveType("sick");
        setReason("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal mencatat absensi");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/attendance?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Data absensi berhasil dihapus");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menghapus data");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setDeleteId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

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
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                  >
                    <SelectTrigger id="employee" className="w-full">
                      <SelectValue placeholder="Pilih Karyawan" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
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
                      onValueChange={(val) => setLeaveType(val)}
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

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="Kasir">Kasir</SelectItem>
                  <SelectItem value="Admin Cabang">Admin Cabang</SelectItem>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.employeeName}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                      {formatTime(item.checkIn)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatTime(item.checkOut)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!item.isPresent ? (
                          <Badge
                            variant="outline"
                            className="w-24 justify-center bg-slate-100 text-slate-500 border-dashed"
                          >
                            Belum Hadir
                          </Badge>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className={`w-24 justify-center ${
                                statusConfig[item.status]?.className ||
                                "bg-slate-100"
                              }`}
                            >
                              {statusConfig[item.status]?.label || item.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Absensi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data absensi ini akan dihapus
              permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
