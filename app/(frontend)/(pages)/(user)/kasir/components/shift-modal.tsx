"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShift, ShiftEmployee } from "../context/shift-context";
import { useBranch } from "@/contexts/branch-context";
import { Banknote, AlertTriangle, User } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { PinEntryModal } from "./pin-entry-modal";

// Shift time configuration (in 24-hour format)
const SHIFT_TIMES = {
  Pagi: { start: 8, end: 15 }, // 08:00 - 15:00
  Sore: { start: 15, end: 22 }, // 15:00 - 22:00
} as const;

const LATE_TOLERANCE_MINUTES = 15; // 15 minutes tolerance

// Helper to check if employee is late based on scheduled start time
const isLate = (scheduleStartTime: string): boolean => {
  if (!scheduleStartTime) return false;

  const now = new Date();
  const [schedHour, schedMinute] = scheduleStartTime.split(":").map(Number);

  const shiftStart = new Date(now);
  shiftStart.setHours(schedHour, schedMinute, 0, 0);

  // Add tolerance
  const lateThreshold = new Date(
    shiftStart.getTime() + LATE_TOLERANCE_MINUTES * 60000,
  );

  return now > lateThreshold;
};

// ... (getCurrentShift helper removed as we use actual schedule) ...

// Helper to get local date string YYYY-MM-DD
const getLocalYYYYMMDD = (date: Date): string => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

// Helper to get day index (0=Monday, 6=Sunday)
const getDayIndex = (): number => {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday in JS
  return day === 0 ? 6 : day - 1; // Convert to 0=Monday, ..., 6=Sunday
};

// Helper to get week start date (Monday)
const getWeekStart = (): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  return getLocalYYYYMMDD(monday);
};

// Check if employee has a schedule for today
const checkEmployeeSchedule = async (
  employeeId: string,
): Promise<{
  hasSchedule: boolean;
  shiftType: string | null;
  startTime: string | null;
  endTime: string | null;
}> => {
  try {
    const weekStart = getWeekStart();
    const dayIndex = getDayIndex();

    // Add cache: 'no-store' to prevent caching
    const response = await fetch(
      `/api/shift-schedules?week_start=${weekStart}&employee_id=${employeeId}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch schedule");
    }

    const schedules = await response.json();

    // Find today's schedule
    const todaySchedule = schedules.find(
      (s: any) => s.day_of_week === dayIndex,
    );

    if (!todaySchedule || todaySchedule.shift_type === "Libur") {
      return {
        hasSchedule: false,
        shiftType: todaySchedule?.shift_type || null,
        startTime: null,
        endTime: null,
      };
    }

    return {
      hasSchedule: true,
      shiftType: todaySchedule.shift_type,
      startTime: todaySchedule.start_time,
      endTime: todaySchedule.end_time,
    };
  } catch (error) {
    return {
      hasSchedule: false,
      shiftType: null,
      startTime: null,
      endTime: null,
    };
  }
};

// Check if employee already checked in today
const checkAlreadyCheckedIn = async (employeeId: string): Promise<boolean> => {
  try {
    const today = getLocalYYYYMMDD(new Date());

    const response = await fetch(
      `/api/attendance?employee_id=${employeeId}&date=${today}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return false; // Assume not checked in if API fails
    }

    const records = await response.json();

    // If there's any record for today, they've already checked in
    return records.length > 0;
  } catch (error) {
    return false;
  }
};

interface ShiftModalProps {
  isOpen: boolean;
  mode: "open" | "close";
  onOpenChange: (open: boolean) => void;
}

export function ShiftModal({ isOpen, mode, onOpenChange }: ShiftModalProps) {
  const router = useRouter();
  const { openShift, closeShift, shiftData, checkActiveSession, resumeShift } =
    useShift();
  const { clockIn, clockOut, currentBranch, setActiveEmployee, logout } =
    useBranch();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  // PIN Entry states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState<ShiftEmployee | null>(
    null,
  );
  const [step, setStep] = useState<"pin" | "amount">("pin");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError("");
      setSummary(null);
      setShowConfirm(false);
      setNotes("");
      setPendingEmployee(null);
      // For opening shift, always require PIN first
      setStep(mode === "open" ? "pin" : "amount");
      if (mode === "open") {
        setShowPinModal(true);
      }
    }
  }, [isOpen, mode]);

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    if (!number) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(number));
  };

  const parseNumber = (value: string) => {
    return parseInt(value.replace(/\./g, "") || "0");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatNumber(rawValue);
    setAmount(formatted);
  };

  const handlePinSuccess = async (employee: {
    id: string;
    name: string;
    role: string;
    branch: string;
    branchId?: string;
  }) => {
    setPendingEmployee(employee);
    setShowPinModal(false);

    // Set active employee immediately so context is ready
    setActiveEmployee(employee);

    if (mode === "open") {
      // Check for existing open shift for this branch
      const branchIdToCheck = currentBranch?.id || employee.branchId || "";
      if (branchIdToCheck) {
        toast.loading("Memeriksa sesi aktif...", { id: "check-session" });
        const activeSession = await checkActiveSession(branchIdToCheck);
        toast.dismiss("check-session");

        if (activeSession) {
          resumeShift(activeSession);
          toast.success("Melanjutkan Sesi Shift", {
            description: `Shift sebelumnya belum ditutup. Melanjutkan shift ${activeSession.opener?.name || ""}.`,
          });
          onOpenChange(false);
          return;
        }
      }
    }

    setStep("amount");
  };

  const handleSubmit = async () => {
    const value = parseNumber(amount);

    if (value < 0) {
      setError("Mohon masukkan jumlah uang yang valid.");
      toast.error("Input tidak valid", {
        description: "Mohon masukkan jumlah uang yang valid.",
      });
      return;
    }

    if (mode === "open") {
      if (!pendingEmployee) {
        toast.error("Verifikasi PIN diperlukan");
        setShowPinModal(true);
        return;
      }

      // Check if employee has schedule for today
      const dayNames = [
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
        "Minggu",
      ];
      const todayName = dayNames[getDayIndex()];

      toast.loading("Memeriksa jadwal...", { id: "check-schedule" });
      const { hasSchedule, shiftType, startTime } = await checkEmployeeSchedule(
        pendingEmployee.id,
      );
      toast.dismiss("check-schedule");

      if (!hasSchedule) {
        const message =
          shiftType === "Libur"
            ? `${pendingEmployee.name} dijadwalkan LIBUR hari ini (${todayName}).`
            : `${pendingEmployee.name} tidak memiliki jadwal untuk hari ini (${todayName}).`;

        toast.error("Tidak Dapat Membuka Shift", {
          description:
            message + " Silakan hubungi Admin untuk mengatur jadwal.",
          duration: 4000,
        });

        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);

        return;
      }

      // Check if already checked in today
      const alreadyCheckedIn = await checkAlreadyCheckedIn(pendingEmployee.id);
      if (alreadyCheckedIn) {
        toast.info("Sudah Absen Hari Ini", {
          description: `${pendingEmployee.name} sudah melakukan absensi masuk hari ini.`,
          duration: 5000,
        });
        const branchIdToUse = currentBranch?.id || pendingEmployee.branchId;
        if (!branchIdToUse) {
          toast.error("Gagal membuka shift: Data cabang tidak ditemukan");
          return;
        }

        openShift(value, pendingEmployee, branchIdToUse);
        toast.success("Shift berhasil dibuka!", {
          description: `${pendingEmployee.name} - (Absensi sudah tercatat sebelumnya)`,
          duration: 5000,
        });
        onOpenChange(false);
        return;
      }

      const branchIdToUse = currentBranch?.id || pendingEmployee.branchId;

      if (!branchIdToUse) {
        toast.error("Gagal membuka shift: Data cabang tidak ditemukan");
        return;
      }

      await openShift(value, pendingEmployee, branchIdToUse);

      // Auto Clock In with late detection
      if (currentBranch) {
        const shift = shiftType || "Shift"; // Use actual shift type from schedule
        // Use startTime from schedule for late check
        const lateStatus = startTime ? isLate(startTime) : false;
        const status = lateStatus ? "Terlambat" : "Hadir";

        clockIn(pendingEmployee.id, currentBranch.id, shift, status)
          .then(() => {
            if (lateStatus) {
              toast.warning("Absensi Masuk - TERLAMBAT", {
                description: `Shift ${shift} dimulai jam ${startTime?.slice(0, 5)}. Toleransi ${LATE_TOLERANCE_MINUTES} menit.`,
                duration: 6000,
              });
            } else {
              toast.success("Absensi Masuk Berhasil");
            }
          })
          .catch((err) => {
            toast.error("Gagal mencatat absensi masuk");
          });
      }

      const now = new Date();
      toast.success("Shift berhasil dibuka!", {
        description: `${pendingEmployee.name} - Absen Masuk: ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
        duration: 5000,
      });
      onOpenChange(false);
    } else {
      // For closing, require PIN confirmation
      setShowPinModal(true);
    }
  };

  const [isEarlyClosing, setIsEarlyClosing] = useState(false);
  const [scheduledEndTime, setScheduledEndTime] = useState<string | null>(null);

  const handleCloseShiftPinSuccess = async (employee: {
    id: string;
    name: string;
    role: string;
    branch: string;
  }) => {
    setPendingEmployee(employee);
    setShowPinModal(false);

    // Check for early closure
    toast.loading("Memeriksa jadwal...", { id: "check-schedule-close" });
    const { hasSchedule, endTime } = await checkEmployeeSchedule(employee.id);
    toast.dismiss("check-schedule-close");

    if (hasSchedule && endTime) {
      const now = new Date();
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour, endMinute, 0, 0);

      // tolerance: consider early if > 30 mins before end time
      // difference in milliseconds
      const diff = shiftEnd.getTime() - now.getTime();
      const diffMinutes = Math.floor(diff / 60000);

      if (diffMinutes > 30) {
        setIsEarlyClosing(true);
        setScheduledEndTime(endTime.slice(0, 5));
      } else {
        setIsEarlyClosing(false);
        setScheduledEndTime(null);
      }
    } else {
      setIsEarlyClosing(false);
    }

    setShowConfirm(true);
  };

  const handleConfirmClosure = async () => {
    const value = parseNumber(amount);
    if (!pendingEmployee) return;

    try {
      toast.loading("Menutup shift...", { id: "close-shift" });
      await closeShift(value, pendingEmployee, notes);

      // Auto Clock Out - Pass status if early
      // Fix: Send undefined to keep DB status check happy (e.g. "Hadir" or "Terlambat" from clock-in)
      // "Pulang Awal" is just a note.
      const clockOutStatus = undefined;

      // Append to notes if early
      let finalNotes = notes;
      if (isEarlyClosing) {
        finalNotes = notes ? `${notes} (Pulang Awal)` : "Pulang Awal";
      }

      // We need to pass notes to closeShift but clockOut logic is separate?
      // Actually closeShift (context) handles the SHIFT record. clockOut (context) handles ATTENDANCE.
      // We should update attendance notes if needed.
      // However, the current clockOut function in branch-context only takes status.
      // Let's just update the shift note for now, and let attendance status remain as checked-in status.
      // (Or we update the API to allow updating notes on clockout, but let's stick to the plan: fix ID error first).

      await closeShift(value, pendingEmployee, finalNotes);
      await closeShift(value, pendingEmployee, finalNotes);
      await clockOut(pendingEmployee.id, clockOutStatus);

      toast.dismiss("close-shift");
      toast.success("Shift Berhasil Ditutup", {
        description: "Laporan shift disimpan. Logout...",
      });

      setShowConfirm(false);
      onOpenChange(false);

      // Logout and redirect
      logout();
      router.push("/login"); // or wherever the login page is
    } catch (err: any) {
      toast.dismiss("close-shift");
      toast.error("Gagal menutup shift", {
        description: err.message || "Terjadi kesalahan pada server",
      });
    }
  };

  return (
    <>
      <PinEntryModal
        isOpen={showPinModal}
        onOpenChange={setShowPinModal}
        onSuccess={
          mode === "open" ? handlePinSuccess : handleCloseShiftPinSuccess
        }
        branchName={currentBranch?.name || "Cabang"}
        title={mode === "open" ? "Buka Shift Kasir" : "Verifikasi Tutup Shift"}
        description={
          mode === "open"
            ? "Masukkan PIN kasir untuk membuka shift baru"
            : "Masukkan PIN untuk konfirmasi tutup shift"
        }
        successMessage={mode === "close" ? null : undefined} // Suppress welcome toast on close
      />
      <Dialog open={isOpen && !showPinModal} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              {mode === "open" ? "Mulai Shift Baru" : "Tutup Sesi Kasir"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-slate-600">
                {mode === "open"
                  ? "Modal Awal (Cash in Drawer)"
                  : "Uang Fisik di Laci"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  Rp
                </span>
                <Input
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  className="pl-10 h-12 text-xl font-bold border-slate-200 focus:border-green-500 focus:ring-green-500"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            {mode === "close" && (
              <div className="grid gap-2">
                <Label htmlFor="notes" className="text-slate-600">
                  Catatan Tambahan
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Selisih uang parkir, dll..."
                  className="focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              className={`flex-1 ${mode === "open" ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-orange-600 hover:bg-orange-700 shadow-orange-100"} shadow-lg text-white font-semibold`}
              onClick={handleSubmit}
            >
              {mode === "open" ? "Buka Kasir" : "Selesai & Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                isEarlyClosing ? "text-amber-600 flex items-center gap-2" : ""
              }
            >
              {isEarlyClosing && <AlertTriangle className="h-5 w-5" />}
              {isEarlyClosing
                ? "Peringatan: Pulang Awal"
                : "Konfirmasi Tutup Shift"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Apakah Anda yakin jumlah uang di laci sudah benar? Data ini akan
                dicatat dan shift akan segera ditutup.
              </p>
              {isEarlyClosing && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm font-medium mt-3">
                  Shift ini seharusnya berakhir pukul {scheduledEndTime}. Anda
                  menutup shift lebih awal dari jadwal.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={
                isEarlyClosing
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
              onClick={handleConfirmClosure}
            >
              {isEarlyClosing ? "Ya, Tetap Tutup" : "Ya, Sudah Benar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
