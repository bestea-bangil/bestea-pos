"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBranch } from "@/contexts/branch-context";
import { useEmployee } from "@/app/context/employee-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, User, KeyRound } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useBranch();
  const { setActiveEmployee } = useEmployee();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // Sync active employee to EmployeeContext
        if (result.employee) {
          setActiveEmployee({
            id: result.employee.id,
            name: result.employee.name,
            role: result.employee.role,
            branch: result.employee.branch,
          });
        }

        toast.success("Berhasil masuk!", {
          description: `Selamat datang kembali, ${result.role === "cashier" ? result.employee?.name : "Admin"}`,
        });

        if (result.role === "super_admin" || result.role === "branch_admin") {
          router.push("/dashboard");
        } else if (result.role === "cashier") {
          router.push("/kasir");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error("Gagal masuk", {
          description:
            result.error || "Silakan cek kembali email dan password/PIN Anda.",
        });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="grid gap-2 text-center mb-8">
          <div className="mx-auto mb-4 bg-green-50 p-4 rounded-full">
            <Image
              src="/logo/bestea-logo.png"
              alt="Logo Bestea POS"
              width={60}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Selamat Datang
          </h1>
          <p className="text-muted-foreground text-sm">
            Masuk untuk mengelola outlet Anda
          </p>
        </div>

        <form onSubmit={handleLogin} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email" className="font-semibold text-slate-700">
              Email
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="nama@bestea.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500 focus:ring-green-500 transition-all"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="font-semibold text-slate-700"
              >
                Password / PIN
              </Label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••"
                className="pl-10 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-green-500 focus:ring-green-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-green-600 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gunakan PIN 4 digit untuk akses Kasir.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-md hover:shadow-lg mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Masuk ke Dashboard"
            )}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground mt-6">
          Butuh bantuan akses?{" "}
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%2C%20saya%20butuh%20bantuan%20akses%20Bestea%20POS"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-600"
          >
            Hubungi Administrator
          </a>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        © 2026 Bestea Bangil. All rights reserved.
      </p>
    </div>
  );
}
