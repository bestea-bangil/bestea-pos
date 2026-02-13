"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Package,
  Filter,
  ImageIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
interface ProductVariant {
  name: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId?: string | null;
  price: number | null;
  trackStock: boolean;
  stock: number;
  image: string;
  status: "active" | "inactive";
  variants?: ProductVariant[];
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

export default function ProductPage() {
  const pathname = usePathname();
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<
    Omit<Product, "id" | "price"> & { price: number | "" }
  >({
    name: "",
    category: "",
    categoryId: "",
    price: 0,
    trackStock: true,
    stock: 0,
    status: "active",
    image: "",
    variants: [],
  });

  // Fetch Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data produk");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("product-dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, pathname]);

  // Filter Logic
  const filteredProducts = products.filter((prod) => {
    const matchSearch = prod.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || prod.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Handlers
  const handleOpenModal = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        category: prod.category,
        categoryId: prod.categoryId,
        price: prod.price !== null ? prod.price : "",
        trackStock: prod.trackStock !== undefined ? prod.trackStock : true,
        stock: prod.stock,
        status: prod.status,
        image: prod.image,
        variants: prod.variants || [],
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        category: "",
        categoryId: "",
        price: 0,
        trackStock: true,
        stock: 0,
        status: "active",
        image: "",
        variants: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.categoryId) {
      toast.error("Nama dan Kategori wajib diisi");
      return;
    }

    // Prepare payload
    const payload = {
      ...formData,
      price: formData.price === "" ? null : Number(formData.price),
    };

    // Check if editing and no changes
    if (editingProduct) {
      const isUnchanged =
        payload.name === editingProduct.name &&
        payload.categoryId === editingProduct.categoryId &&
        payload.price === editingProduct.price &&
        payload.trackStock === editingProduct.trackStock &&
        payload.stock === editingProduct.stock &&
        payload.status === editingProduct.status &&
        payload.image === editingProduct.image &&
        JSON.stringify(payload.variants) ===
          JSON.stringify(editingProduct.variants); // Simple comparison for variants

      if (isUnchanged) {
        setIsModalOpen(false);
        return;
      }
    }

    try {
      const url = "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const body = editingProduct
        ? { ...payload, id: editingProduct.id }
        : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save product");

      toast.success(
        editingProduct
          ? "Produk berhasil diperbarui"
          : "Produk baru berhasil ditambahkan",
      );
      setIsModalOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Gagal menyimpan produk");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/products?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Produk berhasil dihapus");
      setDeleteId(null);
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Gagal menghapus produk");
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Produk</h1>
          <p className="text-muted-foreground">
            Kelola menu, harga, dan stok produk Anda
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Tidak ada produk yang ditemukan
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedProducts.map((prod) => (
                  <Card
                    key={prod.id}
                    className="group overflow-hidden border-slate-200 shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-300 flex flex-col bg-white"
                  >
                    {/* Product Image Area */}
                    <div className="relative aspect-square bg-slate-50 overflow-hidden">
                      {prod.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="h-16 w-16" />
                        </div>
                      )}

                      {/* Floating Status Badge */}
                      <div className="absolute top-3 right-3">
                        {prod.status === "active" ? (
                          <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-green-700 shadow-sm flex items-center gap-1.5 border border-green-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            AKTIF
                          </div>
                        ) : (
                          <div className="bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1.5">
                            ARSIP
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                            {prod.category}
                          </span>
                        </div>
                        <h3
                          className="font-bold text-slate-900 text-base leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-green-700 transition-colors"
                          title={prod.name}
                        >
                          {prod.name}
                        </h3>
                      </div>

                      <div className="mt-auto space-y-4">
                        {/* Price & Variants Indicator */}
                        {/* Price & Variants List */}
                        <div className="space-y-1.5 pb-3 border-b border-slate-50">
                          {/* Base Price */}
                          {prod.price !== null && prod.price > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">
                                Dasar
                              </span>
                              <span className="text-sm font-bold text-green-700">
                                {formatCurrency(prod.price)}
                              </span>
                            </div>
                          )}

                          {/* Variants */}
                          {prod.variants && prod.variants.length > 0
                            ? prod.variants.map((v, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center"
                                >
                                  <span className="text-xs text-slate-500">
                                    {v.name}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700">
                                    {formatCurrency(v.price)}
                                  </span>
                                </div>
                              ))
                            : // Show 0 if no price and no variants
                              (!prod.price || prod.price === 0) && (
                                <span className="text-lg font-bold text-green-700">
                                  {formatCurrency(0)}
                                </span>
                              )}
                        </div>

                        {/* Stock Indicator */}
                        {prod.trackStock ? (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 font-medium">
                                Stok Tersedia
                              </span>
                              <span
                                className={`font-bold ${
                                  prod.stock < 10
                                    ? "text-red-500"
                                    : "text-slate-700"
                                }`}
                              >
                                {prod.stock} unit
                              </span>
                            </div>
                            {/* Simple Progress Bar visual */}
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  prod.stock < 10
                                    ? "bg-red-500 w-full"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width:
                                    prod.stock < 10
                                      ? "100%"
                                      : `${Math.min(100, (prod.stock / 50) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg w-full">
                            <Package className="w-3.5 h-3.5" />
                            Stok Unlimited
                          </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs font-medium hover:bg-slate-50 hover:text-slate-900 border-slate-200"
                            onClick={() => handleOpenModal(prod)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(prod.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {startIndex + 1}-
                    {Math.min(endIndex, filteredProducts.length)} dari{" "}
                    {filteredProducts.length} produk
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Add/Edit */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription>Isi detail produk dan harga.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.categoryId || ""}
                  onValueChange={(val) => {
                    const selectedCat = categories.find((c) => c.id === val);
                    setFormData({
                      ...formData,
                      categoryId: val,
                      category: selectedCat?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status Produk</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="active">Aktif (Dijual)</SelectItem>
                    <SelectItem value="inactive">
                      Arsip (Disembunyikan)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="flex flex-col gap-2">
              <Label>Gambar Produk</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 relative rounded-md overflow-hidden bg-slate-100 border border-input shrink-0 flex items-center justify-center">
                  {formData.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="grid gap-1.5 flex-1">
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer file:cursor-pointer"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Format: JPG, PNG, WEBP. Maks 2MB.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Contoh: Es Teh Manis"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Harga Dasar (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price:
                        e.target.value === "" ? "" : parseInt(e.target.value),
                    })
                  }
                  placeholder="Opsional jika ada varian"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stock">Stok Awal</Label>
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="trackStock"
                      className="text-xs text-muted-foreground font-normal cursor-pointer"
                    >
                      Lacak Stok
                    </Label>
                    <Switch
                      id="trackStock"
                      className="scale-75 origin-right"
                      checked={formData.trackStock}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, trackStock: checked })
                      }
                    />
                  </div>
                </div>
                {formData.trackStock ? (
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: parseInt(e.target.value),
                      })
                    }
                  />
                ) : (
                  <Input
                    disabled
                    value="Unlimited"
                    className="bg-slate-100 text-slate-500 font-medium"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Varian Ukuran (Opsional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const basePrice =
                    typeof formData.price === "number" ? formData.price : 0;
                  const newVariant = { name: "", price: basePrice };
                  setFormData({
                    ...formData,
                    variants: [...(formData.variants || []), newVariant],
                  });
                }}
              >
                <Plus className="mr-2 h-3 w-3" />
                Tambah Varian
              </Button>
            </div>

            {formData.variants && formData.variants.length > 0 ? (
              <div className="space-y-3">
                {formData.variants.map((variant, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs">Nama (ex: Large)</Label>
                      <Input
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...(formData.variants || [])];
                          newVariants[idx].name = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                      />
                    </div>
                    <div className="grid gap-1 w-[120px]">
                      <Label className="text-xs">Harga</Label>
                      <Input
                        type="number"
                        value={variant.price}
                        onChange={(e) => {
                          const newVariants = [...(formData.variants || [])];
                          newVariants[idx].price =
                            parseInt(e.target.value) || 0;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        const newVariants = formData.variants?.filter(
                          (_, i) => i !== idx,
                        );
                        setFormData({
                          ...formData,
                          variants: newVariants || [],
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Tidak ada varian (Harga mengikuti Harga Dasar)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan Produk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Produk?</DialogTitle>
            <DialogDescription>
              Tindakan ini permanen. Produk akan dihapus dari semua cabang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
