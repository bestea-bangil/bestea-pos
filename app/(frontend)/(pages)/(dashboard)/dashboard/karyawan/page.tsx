"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
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
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Key,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Types
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  branchId?: string;
  status: "active" | "inactive";
  joinDate: string;
  baseSalary: number;
  hourlyRate: number;
  deductionAmount?: number;
  pin: string;
}

interface Branch {
  id: string;
  name: string;
  type: string;
}

interface Role {
  id: string;
  name: string;
}

const statusConfig = {
  active: { label: "Aktif", className: "bg-green-100 text-green-700" },
  inactive: { label: "Non-Aktif", className: "bg-red-100 text-red-700" },
};

// Roles will be fetched dynamically from API

export default function KaryawanPage() {
  const pathname = usePathname();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    branchId: string;
    status: "active" | "inactive";
    baseSalary: number;
    hourlyRate: number;
    deductionAmount: number;
    pin: string;
  }>({
    name: "",
    email: "",
    phone: "",
    role: "Kasir",
    branchId: "",
    status: "active",
    baseSalary: 1500000,
    hourlyRate: 0,
    deductionAmount: 50000,
    pin: "",
  });

  const generatePin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, branchRes, roleRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/branches"),
        fetch("/api/roles"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData.filter((b: any) => b.type === "cabang"));
      }
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        setAvailableRoles(roleData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data karyawan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  // Handlers
  const handleOpenModal = (emp: Employee | null = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        branchId: emp.branchId || "",
        status: emp.status,
        baseSalary: emp.baseSalary || 1500000,
        hourlyRate: emp.hourlyRate || 0,
        deductionAmount: emp.deductionAmount || 50000,
        pin: emp.pin || "",
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "Kasir",
        branchId: branches[0]?.id || "",
        status: "active",
        baseSalary: 1500000,
        hourlyRate: 0,
        deductionAmount: 50000,
        pin: generatePin(),
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Harap isi nama dan email");
      return;
    }

    try {
      const url = "/api/employees";
      const method = editingEmployee ? "PUT" : "POST";
      const body = editingEmployee
        ? { ...formData, id: editingEmployee.id }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save employee");

      toast.success(
        editingEmployee
          ? "Data karyawan diperbarui"
          : "Karyawan baru ditambahkan",
      );
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Gagal menyimpan data karyawan");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/employees?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Karyawan berhasil dihapus");
      setDeleteId(null);
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Gagal menghapus karyawan");
    }
  };

  const handleResetPin = async (emp: Employee) => {
    const newPin = generatePin();
    // Optimistic update or dedicated API endpoint could be used.
    // Here we reuse PUT logic but simpler just updating PIN
    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emp, pin: newPin }),
      });

      if (!res.ok) throw new Error("Failed to reset PIN");

      toast.success(`PIN baru untuk ${emp.name}: ${newPin}`);
      fetchData();
    } catch (error) {
      console.error("Reset PIN error:", error);
      toast.error("Gagal reset PIN");
    }
  };

  // Filtering
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBranch = branchFilter === "all" || emp.branch === branchFilter;
    return matchSearch && matchBranch;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Karyawan</h1>
          <p className="text-muted-foreground">
            Kelola data seluruh karyawan dan penempatan cabang
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Karyawan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
          <CardDescription>
            Cari karyawan berdasarkan nama atau filter per cabang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Karyawan</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>PIN Kasir</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tgl Gabung</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Tidak ada karyawan ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                            {emp.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.role}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="mr-1.5 h-3 w-3" />
                          {emp.email}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Phone className="mr-1.5 h-3 w-3" />
                          {emp.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.pin ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 font-mono w-[60px] justify-center"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            {visiblePins[emp.id] ? emp.pin : "••••"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePinVisibility(emp.id)}
                          >
                            {visiblePins[emp.id] ? (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Building2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        {emp.branch}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          statusConfig[emp.status as keyof typeof statusConfig]
                            ?.className
                        }
                      >
                        {
                          statusConfig[emp.status as keyof typeof statusConfig]
                            ?.label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(emp.joinDate).toLocaleDateString("id-ID")}
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
                          <DropdownMenuLabel>Opsi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenModal(emp)}
                          >
                            Edit Data
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPin(emp)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reset PIN
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteId(emp.id);
                            }}
                          >
                            Hapus Karyawan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {filteredEmployees.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1}-
              {Math.min(endIndex, filteredEmployees.length)} dari{" "}
              {filteredEmployees.length} karyawan
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi data profil dan penempatan kerja karyawan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Contoh: John Doe"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">No. WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="0812..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pin">PIN Kasir (4 digit)</Label>
              <div className="flex gap-2">
                <Input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  placeholder="1234"
                  className="font-mono text-center tracking-widest"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData({ ...formData, pin: generatePin() })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PIN digunakan untuk absen masuk/keluar di kasir
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role / Jabatan</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Penempatan Cabang</Label>
                <Select
                  value={formData.branchId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, branchId: v })
                  }
                >
                  <SelectTrigger id="branch" className="w-full">
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="baseSalary">Gaji Pokok</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    Rp
                  </span>
                  <Input
                    id="baseSalary"
                    type="number"
                    className="pl-9"
                    value={formData.baseSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalary: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground h-[15px]">
                  Gaji bulanan
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deductionAmount">Potongan (Absen)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    Rp
                  </span>
                  <Input
                    id="deductionAmount"
                    type="number"
                    className="pl-9"
                    value={formData.deductionAmount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deductionAmount: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground h-[15px]">
                  Per hari tidak masuk
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status Karyawan</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    status: v as "active" | "inactive",
                  })
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="active">Aktif Bekerja</SelectItem>
                  <SelectItem value="inactive">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {editingEmployee ? "Simpan Perubahan" : "Simpan Karyawan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apakah Anda yakin?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus karyawan juga akan{" "}
              <span className="font-bold text-red-600">
                MENGHAPUS AKUN LOGIN
              </span>{" "}
              mereka secara permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
