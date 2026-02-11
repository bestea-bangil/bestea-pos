"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Save,
  Camera,
  Eye,
  EyeOff,
} from "lucide-react";
import { useBranch, Employee } from "@/contexts/branch-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// Extended employee info for Akun page
interface ExtendedEmployee extends Employee {
  phone?: string;
  baseSalary?: number;
  hourlyRate?: number;
  avatar_url?: string;
}

export default function AkunPage() {
  const { activeEmployee, employees, userRole, logout } = useBranch();
  const router = useRouter();

  // Get full employee data
  const currentUser = activeEmployee
    ? (employees.find((e) => e.id === activeEmployee.id) as
        | ExtendedEmployee
        | undefined) || null
    : null;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [avatar, setAvatar] = useState("");

  // Load avatar from DB on mount
  useEffect(() => {
    if (currentUser?.avatar_url) {
      setAvatar(currentUser.avatar_url);
    }
  }, [currentUser?.avatar_url]);

  // Update form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Role display name
  const roleDisplayName =
    userRole === "super_admin"
      ? "Super Admin"
      : userRole === "branch_admin"
        ? "Admin Cabang"
        : "Kasir";

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentUser.id,
          name,
          email,
          phone,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal memperbarui profil");

      // Update activeEmployee in localStorage
      const storedEmployee = localStorage.getItem("bestea-active-employee");
      if (storedEmployee) {
        const parsed = JSON.parse(storedEmployee);
        parsed.name = name;
        parsed.email = email;
        parsed.phone = phone;
        localStorage.setItem("bestea-active-employee", JSON.stringify(parsed));
      }

      setIsEditingProfile(false);
      toast.success("Profil berhasil diperbarui");
      window.location.reload(); // Refresh to update context
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Gagal memperbarui profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Harap lengkapi semua field");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentUser?.id,
          password: newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal mengubah password");

      toast.success("Password berhasil diubah. Silakan login kembali.");
      setIsChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");

      // Logout and redirect
      setTimeout(() => {
        logout();
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah password");
    }
  };

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      setAvatar(result);

      try {
        const response = await fetch("/api/account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentUser?.id,
            avatar_url: result, // In production, upload to storage first
          }),
        });
        if (!response.ok) throw new Error("Gagal mengupdate foto");

        // Update activeEmployee in localStorage
        const storedEmployee = localStorage.getItem("bestea-active-employee");
        if (storedEmployee) {
          const parsed = JSON.parse(storedEmployee);
          parsed.avatar_url = result;
          localStorage.setItem(
            "bestea-active-employee",
            JSON.stringify(parsed),
          );
        }

        toast.success("Foto profil berhasil diperbarui");
        window.location.reload(); // Refresh to update sidebar and context
      } catch (error) {
        toast.error("Gagal mengupdate foto profil");
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Akun</h1>
        <p className="text-muted-foreground">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Avatar
                  className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleAvatarClick}
                >
                  <AvatarImage src={avatar || undefined} alt="Profile" />
                  <AvatarFallback className="text-xl bg-green-100 text-green-700">
                    {currentUser?.name ? getInitials(currentUser.name) : "CN"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white"
                  onClick={handleAvatarClick}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardTitle>{currentUser.name}</CardTitle>
            <CardDescription>{currentUser.email}</CardDescription>
            <div className="flex justify-center mt-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Shield className="mr-1 h-3 w-3" />
                {roleDisplayName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{currentUser.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{currentUser.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informasi Profil
                  </CardTitle>
                  <CardDescription>
                    Perbarui informasi dasar akun Anda
                  </CardDescription>
                </div>
                {!isEditingProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">No. Telepon</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveProfile}>
                      <Save className="mr-2 h-4 w-4" />
                      Simpan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setName(currentUser.name);
                        setEmail(currentUser.email || "");
                        setPhone(currentUser.phone || "");
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Nama</span>
                    <span className="col-span-2 font-medium">
                      {currentUser.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="col-span-2 font-medium">
                      {currentUser.email}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">No. Telepon</span>
                    <span className="col-span-2 font-medium">
                      {currentUser.phone || "-"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Keamanan
                </CardTitle>
                <CardDescription>Kelola password akun Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Amankan akun dengan password yang kuat
                    </p>
                  </div>
                  <Dialog
                    open={isChangingPassword}
                    onOpenChange={setIsChangingPassword}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">Ubah Password</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ubah Password</DialogTitle>
                        <DialogDescription>
                          Masukkan password baru Anda
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="new-password">Password Baru</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm-password">
                            Konfirmasi Password Baru
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsChangingPassword(false)}
                        >
                          Batal
                        </Button>
                        <Button onClick={handleChangePassword}>
                          Simpan Password
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
