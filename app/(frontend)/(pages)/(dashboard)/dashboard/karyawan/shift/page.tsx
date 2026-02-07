"use client";

import { useState, useEffect } from "react";
import { Plus, CalendarIcon } from "lucide-react";
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

import { useEmployee } from "@/app/context/employee-context";

// ... constants ...

export default function ShiftPage() {
  const { employees: allEmployees } = useEmployee();
  // Filter out Super Admin and Admin Cabang - only show Kasir in shift schedule
  const employees = allEmployees.filter((e) => e.role === "Kasir");
  // Default to index 4 (Current Week) since we generated -4 to 4
  const [currentWeek, setCurrentWeek] = useState(availableWeeks[4]);

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

  // Derived state for current week
  // We default to {} to prevent crash if week key missing
  const employeeShifts = allWeeklyShifts[currentWeek] || {};

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
        description: `Jadwal dari minggu (${prevWeek}) telah disalin ke minggu ini.`,
      });
    } else {
      toast.info("Minggu Terawal", {
        description:
          "Ini adalah minggu terawal yang tersedia, tidak ada jadwal sebelumnya.",
      });
    }
  };

  const handleSaveShift = (data: {
    empId: string;
    dayIdx: number;
    type: string;
    startTime: string;
    endTime: string;
  }) => {
    const newAllShifts = { ...allWeeklyShifts };
    const timeString =
      data.type === "Libur" ? "-" : `${data.startTime} - ${data.endTime}`;

    newAllShifts[currentWeek][data.empId][data.dayIdx] = {
      type: data.type,
      time: timeString,
    };

    setAllWeeklyShifts(newAllShifts);
    setIsModalOpen(false);

    const empName = employees.find((e) => e.id === data.empId)?.name;
    toast.success("Jadwal Berhasil Diperbarui", {
      description: `${empName} diatur ke ${data.type} (${timeString}) pada ${days[data.dayIdx]}`,
    });
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
            onClick={handleNewRecordClick}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Buat Jadwal Baru
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <ShiftStats />

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
            <Select value={currentWeek} onValueChange={setCurrentWeek}>
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
