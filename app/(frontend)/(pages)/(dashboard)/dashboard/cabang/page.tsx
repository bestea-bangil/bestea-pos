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
  Building2,
  Plus,
  MoreHorizontal,
  MapPin,
  Phone,
  Users,
  Store,
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
import { toast } from "sonner";
import { useBranch, Branch } from "@/contexts/branch-context";

export default function CabangPage() {
  const { branches, addBranch, updateBranch, deleteBranch, employees } =
    useBranch();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  // Show all branch types
  const displayBranches = branches;

  // Get employee count per branch
  const getEmployeeCount = (branchName: string) => {
    return employees.filter((e) => e.branch === branchName).length;
  };

  const handleOpenModal = (branch: Branch | null = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address || "",
        phone: branch.phone || "",
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Harap isi nama cabang");
      return;
    }

    if (editingBranch) {
      updateBranch({
        ...editingBranch,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
      });
      toast.success("Data cabang diperbarui");
    } else {
      addBranch({
        name: formData.name,
        type: "cabang",
        address: formData.address,
        phone: formData.phone,
      });
      toast.success("Cabang baru ditambahkan");
    }
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    // Check if branch has employees
    const branch = branches.find((b) => b.id === id);
    if (branch && getEmployeeCount(branch.name) > 0) {
      toast.error("Tidak bisa hapus cabang yang masih memiliki karyawan");
      return;
    }
    setDeleteId(id);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBranch(deleteId);
      toast.success("Cabang berhasil dihapus");
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Cabang</h1>
          <p className="text-muted-foreground">
            Kelola cabang-cabang toko Bestea
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Cabang
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cabang</p>
                <p className="text-2xl font-bold">{displayBranches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Karyawan (Kasir)
                </p>
                <p className="text-2xl font-bold">
                  {employees.filter((e) => e.role === "Kasir").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Rata-rata Karyawan
                </p>
                <p className="text-2xl font-bold">
                  {displayBranches.length > 0
                    ? Math.round(
                        employees.filter((e) => e.role === "Kasir").length /
                          displayBranches.length,
                      )
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua Cabang</CardTitle>
          <CardDescription>
            Daftar seluruh cabang toko yang terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Cabang</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayBranches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Store className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{branch.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {branch.id.slice(-4).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        branch.type === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {branch.type === "admin" ? "Pusat (HQ)" : "Cabang"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {branch.address ? (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1.5 h-3.5 w-3.5" />
                        {branch.address}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {branch.phone ? (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-1.5 h-3.5 w-3.5" />
                        {branch.phone}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {getEmployeeCount(branch.name)} orang
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
                        <DropdownMenuLabel>Opsi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenModal(branch)}
                        >
                          Edit Cabang
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDelete(branch.id)}
                        >
                          Hapus Cabang
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {displayBranches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Belum ada cabang. Klik "Tambah Cabang" untuk menambahkan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Cabang" : "Tambah Cabang Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi informasi cabang toko.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Cabang *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Contoh: Cabang Surabaya"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Jl. Contoh No. 123"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0812-3456-7890"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {editingBranch ? "Simpan Perubahan" : "Simpan Cabang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apakah Anda yakin?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Cabang akan dihapus secara
              permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
