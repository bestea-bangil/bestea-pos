"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Check, Loader2, Lock } from "lucide-react";
import { useBranch } from "@/contexts/branch-context";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface PinEntryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (employee: {
    id: string;
    name: string;
    role: string;
    branch: string;
  }) => void;
  branchName: string;
  title?: string;
  description?: string;
  successMessage?: string | null;
}

export function PinEntryModal({
  isOpen,
  onOpenChange,
  onSuccess,
  branchName,
  title = "Verifikasi Karyawan",
  description = "Masukkan password Anda untuk melanjutkan",
  ...props
}: PinEntryModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyPassword } = useBranch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens and focus input
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!password) {
      setError("Password harus diisi");
      return;
    }

    setIsVerifying(true);

    try {
      const employee = await verifyPassword(password);

      if (employee) {
        if (props.successMessage !== null) {
          toast.success(
            props.successMessage || `Selamat datang, ${employee.name}!`,
          );
        }
        onSuccess({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          branch: employee.branch,
        });
      } else {
        setError("Password tidak valid atau karyawan tidak aktif");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch (e) {
      setError("Terjadi kesalahan verifikasi");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
            <Lock className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center text-green-100">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {/* Password Input */}
          <div className="mb-4">
            <Input
              ref={inputRef}
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handleKeyDown}
              placeholder="Masukkan Password"
              className="h-12 text-center"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
            disabled={!password || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Konfirmasi
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
