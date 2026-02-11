"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, CalendarIcon, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Modular Components
import { ShiftStats } from "./components/ShiftStats";
import { ShiftTable } from "./components/ShiftTable";
import { ShiftModal } from "./components/ShiftModal";

// Mock Data
// Mock Employees removed, using Context

const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const shiftColors: Record<string, string> = {
  Pagi: "bg-blue-100 text-blue-700 border-blue-200",
  Sore: "bg-orange-100 text-orange-700 border-orange-200",
  Office: "bg-purple-100 text-purple-700 border-purple-200",
  Libur: "bg-slate-100 text-slate-500 border-slate-200",
};

// Helper: Get label for a week starting from a specific date
function getWeekLabel(startDate: Date) {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(start.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  const startStr = start.toLocaleDateString("id-ID", options);
  const endStr = end.toLocaleDateString("id-ID", {
    ...options,
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

// Generate list of 4 upcoming weeks starting from last Monday
const today = new Date();
const currentDay = today.getDay(); // 0 (Sun) to 6 (Sat)
const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
const lastMonday = new Date(today);
lastMonday.setDate(today.getDate() + diffToMonday);

const availableWeeks: string[] = [];
for (let i = -4; i <= 4; i++) {
  // -4 means 4 weeks ago, 0 is current week, 4 is 4 weeks ahead
  const weekStart = new Date(lastMonday);
  weekStart.setDate(lastMonday.getDate() + i * 7);
  availableWeeks.push(getWeekLabel(weekStart));
}

// Default empty shift for an employee
const createEmptyWeek = () => Array(7).fill({ type: "Libur", time: "-" });

// Helper to get week start date from week label
function getWeekStartDate(weekLabel: string): string {
  // Parse "3 Feb - 9 Feb 2026" format
  const match = weekLabel.match(/(\d+)\s+(\w+)\s*-\s*\d+\s+\w+\s+(\d+)/);
  if (!match) return "";

  const day = parseInt(match[1]);
  const monthStr = match[2];
  const year = parseInt(match[3]);

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    Mei: 4,
    Jun: 5,
    Jul: 6,
    Agu: 7,
    Sep: 8,
    Okt: 9,
    Nov: 10,
    Des: 11,
  };

  const month = monthMap[monthStr] ?? 0;
  const date = new Date(year, month, day);

  // Adjust for timezone to ensure we get the correct YYYY-MM-DD for the local date
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().split("T")[0]; // YYYY-MM-DD
}

import { useBranch } from "@/contexts/branch-context";
import { toast as sonnerToast } from "sonner";
import React from "react";

export default function ShiftPage() {
  const { employees: allEmployees, currentBranch } = useBranch();
  // Filter out Super Admin and Admin Cabang - only show Kasir in shift schedule
  const employees = allEmployees.filter((e) => e.role === "Kasir");
  // Default to index 4 (Current Week) since we generated -4 to 4
  const [currentWeek, setCurrentWeek] = useState(availableWeeks[4]);
  const [isLoading, setIsLoading] = useState(false);

  // Initial structure: Initialize all available weeks with empty shifts
  // We lazily initialize this, but now we need to respect the Context employees
  const [allWeeklyShifts, setAllWeeklyShifts] = useState<
    Record<string, Record<string, { type: string; time: string }[]>>
  >(() => {
    const initial: Record<
      string,
      Record<string, { type: string; time: string }[]>
    > = {};

    availableWeeks.forEach((week) => {
      initial[week] = {};
      // Initialize for current employees context (if available during first render)
      // Note: During first render 'employees' from context might be initial mock data, which is fine.
      employees.forEach((emp) => {
        initial[week][emp.id] = createEmptyWeek();
      });
    });

    // Add mock data for "Current Week" (index 4) - Preserving the demo data logic for key employees
    const currentWeekLabel = availableWeeks[4];
    if (initial[currentWeekLabel]) {
      // We check if these IDs exist in the employee list before assigning to avoid zombie keys if emp deleted
      if (employees.some((e) => e.id === "EMP001")) {
        if (!initial[currentWeekLabel]["EMP001"])
          initial[currentWeekLabel]["EMP001"] = createEmptyWeek();
        initial[currentWeekLabel]["EMP001"][0] = {
          type: "Pagi",
          time: "08:00 - 16:00",
        };
        initial[currentWeekLabel]["EMP001"][1] = {
          type: "Pagi",
          time: "08:00 - 16:00",
        };
      }
      if (employees.some((e) => e.id === "EMP002")) {
        if (!initial[currentWeekLabel]["EMP002"])
          initial[currentWeekLabel]["EMP002"] = createEmptyWeek();
        initial[currentWeekLabel]["EMP002"][0] = {
          type: "Sore",
          time: "16:00 - 22:00",
        };
      }
    }

    return initial;
  });

  // Sync Effect: When employees change (e.g. added), ensure they have entries in the current state
  // This solves "auto add to shift table"
  useEffect(() => {
    setAllWeeklyShifts((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      availableWeeks.forEach((week) => {
        if (!next[week]) next[week] = {};
        employees.forEach((emp) => {
          if (!next[week][emp.id]) {
            next[week][emp.id] = createEmptyWeek();
            hasChanges = true;
          }
        });
      });

      return hasChanges ? next : prev;
    });
  }, [employees]);

  // Track fetching state to prevent duplicate calls
  const isFetchingRef = useRef(false);
  const fetchedWeeksRef = useRef<Set<string>>(new Set());

  // Fetch schedules from API
  const fetchSchedules = useCallback(
    async (weekLabel: string, employeeList: typeof employees) => {
      const weekStart = getWeekStartDate(weekLabel);
      if (!weekStart) return;

      // Prevent duplicate fetches
      if (isFetchingRef.current || fetchedWeeksRef.current.has(weekLabel)) {
        return;
      }

      isFetchingRef.current = true;
      fetchedWeeksRef.current.add(weekLabel);
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/shift-schedules?week_start=${weekStart}`,
        );
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const data = await response.json();

        // Update state with fetched data
        setAllWeeklyShifts((prev) => {
          const next = { ...prev };
          if (!next[weekLabel]) next[weekLabel] = {};

          // Initialize all employees with empty week first
          employeeList.forEach((emp) => {
            if (!next[weekLabel][emp.id]) {
              next[weekLabel][emp.id] = createEmptyWeek();
            }
          });

          // Apply API data
          data.forEach((schedule: any) => {
            const empId = schedule.employee_id;
            const dayIdx = schedule.day_of_week;
            const timeStr =
              schedule.shift_type === "Libur"
                ? "-"
                : `${schedule.start_time?.slice(0, 5)} - ${schedule.end_time?.slice(0, 5)}`;

            if (next[weekLabel][empId]) {
              next[weekLabel][empId][dayIdx] = {
                type: schedule.shift_type,
                time: timeStr,
              };
            }
          });

          return next;
        });
      } catch (error) {
        console.error("Error fetching schedules:", error);
        // Remove from fetched on error so retry is possible
        fetchedWeeksRef.current.delete(weekLabel);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [],
  );

  // Fetch only once when employees are loaded
  const hasFetchedInitial = useRef(false);
  useEffect(() => {
    if (!hasFetchedInitial.current && currentWeek && employees.length > 0) {
      hasFetchedInitial.current = true;
      fetchSchedules(currentWeek, employees);
    }
  }, [currentWeek, employees, fetchSchedules]);

  // Handler for week change (manual)
  const handleWeekChange = (newWeek: string) => {
    setCurrentWeek(newWeek);
    if (!fetchedWeeksRef.current.has(newWeek) && employees.length > 0) {
      fetchSchedules(newWeek, employees);
    }
  };

  // Derived state for current week
  // We default to {} to prevent crash if week key missing
  const employeeShifts = allWeeklyShifts[currentWeek] || {};

  // Calculate stats for ShiftStats component
  const shiftStats = useMemo(() => {
    let totalHours = 0;
    let employeesWithSchedule = 0;

    employees.forEach((emp) => {
      const shifts = employeeShifts[emp.id];
      if (shifts) {
        let empHours = 0;
        shifts.forEach((shift: any) => {
          if (shift.type === "Libur" || shift.time === "-") return;

          try {
            const [startPart, endPart] = shift.time.split(" - ");
            if (!startPart || !endPart) return;

            const [startH, startM] = startPart.split(":").map(Number);
            const [endH, endM] = endPart.split(":").map(Number);

            let diffMins = endH * 60 + endM - (startH * 60 + startM);
            if (diffMins < 0) diffMins += 24 * 60; // Midnight crossing

            empHours += diffMins / 60;
          } catch (e) {}
        });

        totalHours += empHours;
        if (empHours > 0) employeesWithSchedule++;
      }
    });

    return {
      totalHours,
      employeeCount: employees.length,
      employeesWithSchedule,
    };
  }, [employees, employeeShifts]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  const handleCellClick = (empId: string, dayIdx: number) => {
    // Safety check
    if (!employeeShifts[empId]) return;

    const current = employeeShifts[empId][dayIdx];
    setSelectedData({
      empId,
      dayIdx,
      type: current.type,
      time: current.time,
    });
    setIsModalOpen(true);
  };

  const handleNewRecordClick = () => {
    setSelectedData({
      empId: employees[0].id,
      dayIdx: 0,
      type: "Pagi",
      time: "08:00 - 16:00",
    });
    setIsModalOpen(true);
  };

  const handleCopyPrevious = () => {
    const currentIndex = availableWeeks.indexOf(currentWeek);

    if (currentIndex > 0) {
      const prevWeek = availableWeeks[currentIndex - 1];
      const newAllShifts = { ...allWeeklyShifts };
      // Deep copy from direct previous chronological week
      newAllShifts[currentWeek] = JSON.parse(
        JSON.stringify(allWeeklyShifts[prevWeek]),
      );
      setAllWeeklyShifts(newAllShifts);
      toast.success("Jadwal Berhasil Disalin", {
        description: `Jadwal dari minggu (${prevWeek}) telah disalin ke minggu ini. Silakan simpan perubahan.`,
      });
    } else {
      toast.info("Minggu Terawal", {
        description:
          "Ini adalah minggu terawal yang tersedia, tidak ada jadwal sebelumnya.",
      });
    }
  };

  const handleBulkSave = async () => {
    setIsLoading(true);
    const weekStart = getWeekStartDate(currentWeek);
    const currentShifts = allWeeklyShifts[currentWeek];
    const schedulesToSave: any[] = [];

    // Transform local state to API payload
    Object.entries(currentShifts).forEach(([empId, weekData]) => {
      const emp = employees.find((e) => e.id === empId);
      weekData.forEach((dayShift, dayIdx) => {
        let start_time = null;
        let end_time = null;

        if (dayShift.type !== "Libur" && dayShift.time !== "-") {
          const parts = dayShift.time.split(" - ");
          if (parts.length === 2) {
            start_time = parts[0];
            end_time = parts[1];
          }
        }

        schedulesToSave.push({
          employee_id: empId,
          branch_id: currentBranch?.id || emp?.branchId,
          week_start: weekStart,
          day_of_week: dayIdx,
          shift_type: dayShift.type,
          start_time,
          end_time,
        });
      });
    });

    try {
      const response = await fetch("/api/shift-schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: schedulesToSave }),
      });

      if (!response.ok) {
        throw new Error("Failed to bulk save");
      }

      toast.success("Jadwal Berhasil Disimpan", {
        description: "Semua perubahan shift minggu ini telah disimpan.",
      });
    } catch (error) {
      console.error("Bulk save error:", error);
      toast.error("Gagal Menyimpan Jadwal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveShift = async (data: {
    empId: string;
    dayIdx: number;
    type: string;
    startTime: string;
    endTime: string;
  }) => {
    const weekStart = getWeekStartDate(currentWeek);
    const emp = employees.find((e) => e.id === data.empId);

    // Save to database
    try {
      const response = await fetch("/api/shift-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: data.empId,
          branch_id: currentBranch?.id || emp?.branchId,
          week_start: weekStart,
          day_of_week: data.dayIdx,
          shift_type: data.type,
          start_time: data.type === "Libur" ? null : data.startTime,
          end_time: data.type === "Libur" ? null : data.endTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save schedule");
      }

      // Update local state
      const newAllShifts = { ...allWeeklyShifts };
      const timeString =
        data.type === "Libur" ? "-" : `${data.startTime} - ${data.endTime}`;

      newAllShifts[currentWeek][data.empId][data.dayIdx] = {
        type: data.type,
        time: timeString,
      };

      setAllWeeklyShifts(newAllShifts);
      setIsModalOpen(false);

      toast.success("Jadwal Berhasil Disimpan", {
        description: `${emp?.name} diatur ke ${data.type} (${timeString}) pada ${days[data.dayIdx]}`,
      });
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast.error("Gagal Menyimpan Jadwal", {
        description: error.message || "Terjadi kesalahan saat menyimpan",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Shift</h1>
          <p className="text-muted-foreground">
            Atur jadwal kerja karyawan mingguan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyPrevious}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Copy Jadwal Lalu
          </Button>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleBulkSave}
            disabled={isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
          <Button
            onClick={handleNewRecordClick}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Buat Jadwal Baru
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <ShiftStats
        totalHours={shiftStats.totalHours}
        employeeCount={shiftStats.employeeCount}
        employeesWithSchedule={shiftStats.employeesWithSchedule}
      />

      {/* Main Schedule Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Jadwal Mingguan</CardTitle>
              <CardDescription>
                Matriks jadwal shift untuk semua karyawan. Klik pada sel untuk
                mengubah.
              </CardDescription>
            </div>
            <Select value={currentWeek} onValueChange={handleWeekChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Pilih Minggu" />
              </SelectTrigger>
              <SelectContent position="popper">
                {availableWeeks.map((week) => (
                  <SelectItem key={week} value={week}>
                    {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ShiftTable
            employees={employees}
            employeeShifts={employeeShifts}
            days={days}
            shiftColors={shiftColors}
            onCellClick={handleCellClick}
          />
        </CardContent>
      </Card>

      {/* Modal Assignment */}
      <ShiftModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveShift}
        employees={employees}
        days={days}
        shiftColors={shiftColors}
        selectedData={selectedData}
      />
    </div>
  );
}
