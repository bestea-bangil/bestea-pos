"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Employee as DBEmployee,
  AttendanceRecord as DBAttendanceRecord,
  PayrollRecord as DBPayrollRecord,
} from "@/lib/supabase/types";

// Types compatible with existing UI
export interface Employee {
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
  pin: string;
}

interface ActiveEmployee {
  id: string;
  name: string;
  role: string;
  branch: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpha";
  shift: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  hoursWorked: number;
  baseSalary: number;
  hourlyRate: number;
  totalSalary: number;
  status: "Pending" | "Paid";
}

interface EmployeeContextType {
  employees: Employee[];
  activeEmployee: ActiveEmployee | null;
  attendanceRecords: AttendanceRecord[];
  payrollRecords: PayrollRecord[];
  isLoading: boolean;

  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  refreshEmployees: () => Promise<void>;

  verifyPin: (pin: string, branch: string) => Employee | null;
  setActiveEmployee: (employee: ActiveEmployee | null) => void;
  clearActiveEmployee: () => void;
  resetPin: (employeeId: string, newPin: string) => Promise<void>;
  getEmployeesByBranch: (branch: string) => Employee[];

  clockIn: (employeeId: string, shift: string) => Promise<void>;
  clockOut: (employeeId: string) => Promise<void>;
  addAttendanceManual: (record: Omit<AttendanceRecord, "id">) => Promise<void>;
  markPayrollPaid: (payrollId: string) => Promise<void>;
  addPayroll: (record: Omit<PayrollRecord, "id">) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(
  undefined,
);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeEmployee, setActiveEmployeeState] =
    useState<ActiveEmployee | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch employees from Supabase
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`*, branches (name)`)
        .order("name");

      if (error) throw error;

      const formatted: Employee[] = (data || []).map(
        (e: DBEmployee & { branches?: { name: string } }) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          phone: e.phone || "",
          role:
            e.role === "cashier"
              ? "Kasir"
              : e.role === "branch_admin"
                ? "Admin Cabang"
                : "Super Admin",
          branch: e.branches?.name || "",
          branchId: e.branch_id,
          status: e.status as "active" | "inactive",
          joinDate: e.join_date,
          baseSalary: Number(e.base_salary),
          hourlyRate: Number(e.hourly_rate),
          pin: e.pin || "",
        }),
      );

      setEmployees(formatted);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, []);

  // Fetch attendance records
  const fetchAttendance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`*, employees (name), branches (name)`)
        .order("date", { ascending: false })
        .limit(200);

      if (error) throw error;

      const formatted: AttendanceRecord[] = (data || []).map(
        (
          a: DBAttendanceRecord & {
            employees?: { name: string };
            branches?: { name: string };
          },
        ) => ({
          id: a.id,
          employeeId: a.employee_id,
          employeeName: a.employees?.name || "",
          branch: a.branches?.name || "",
          date: a.date,
          checkIn: a.check_in
            ? new Date(a.check_in).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          checkOut: a.check_out
            ? new Date(a.check_out).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          status: a.status as AttendanceRecord["status"],
          shift: a.shift || "",
        }),
      );

      setAttendanceRecords(formatted);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, []);

  // Fetch payroll records
  const fetchPayroll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_records")
        .select(`*, employees (name, role)`)
        .order("month", { ascending: false });

      if (error) throw error;

      const formatted: PayrollRecord[] = (data || []).map(
        (
          p: DBPayrollRecord & { employees?: { name: string; role: string } },
        ) => ({
          id: p.id,
          employeeId: p.employee_id,
          employeeName: p.employees?.name || "",
          role: p.employees?.role || "",
          month: p.month,
          hoursWorked: Number(p.hours_worked),
          baseSalary: Number(p.base_salary),
          hourlyRate: Number(p.hourly_rate),
          totalSalary: Number(p.total_salary),
          status: p.status as PayrollRecord["status"],
        }),
      );

      setPayrollRecords(formatted);
    } catch (error) {
      console.error("Error fetching payroll:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchEmployees(), fetchAttendance(), fetchPayroll()]);

      // Restore active employee from localStorage
      const saved = localStorage.getItem("bestea-active-employee");
      if (saved) {
        try {
          setActiveEmployeeState(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }

      setIsLoading(false);
    };
    init();
  }, [fetchEmployees, fetchAttendance, fetchPayroll]);

  // Realtime subscriptions
  useEffect(() => {
    const employeeChannel = supabase
      .channel("employees-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => fetchEmployees(),
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel("attendance-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        () => fetchAttendance(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employeeChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [fetchEmployees, fetchAttendance]);

  const addEmployee = useCallback(
    async (empData: Omit<Employee, "id">) => {
      const roleMap: Record<string, string> = {
        Kasir: "cashier",
        "Admin Cabang": "branch_admin",
        "Super Admin": "super_admin",
      };

      const { error } = await supabase.from("employees").insert({
        name: empData.name,
        email: empData.email,
        phone: empData.phone,
        role: roleMap[empData.role] || "cashier",
        branch_id: empData.branchId,
        status: empData.status,
        join_date: empData.joinDate,
        base_salary: empData.baseSalary,
        hourly_rate: empData.hourlyRate,
        pin: empData.pin,
      });

      if (error) throw error;
      await fetchEmployees();
    },
    [fetchEmployees],
  );

  const updateEmployee = useCallback(
    async (emp: Employee) => {
      const roleMap: Record<string, string> = {
        Kasir: "cashier",
        "Admin Cabang": "branch_admin",
        "Super Admin": "super_admin",
      };

      const { error } = await supabase
        .from("employees")
        .update({
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          role: roleMap[emp.role] || "cashier",
          branch_id: emp.branchId,
          status: emp.status,
          base_salary: emp.baseSalary,
          hourly_rate: emp.hourlyRate,
          pin: emp.pin,
        })
        .eq("id", emp.id);

      if (error) throw error;
      await fetchEmployees();
    },
    [fetchEmployees],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      await fetchEmployees();
    },
    [fetchEmployees],
  );

  const resetPin = useCallback(
    async (employeeId: string, newPin: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ pin: newPin })
        .eq("id", employeeId);

      if (error) throw error;
      await fetchEmployees();
    },
    [fetchEmployees],
  );

  const verifyPin = useCallback(
    (pin: string, branch: string) => {
      // Only allow cashiers to verify PIN for shifts (exclude admins)
      return (
        employees.find(
          (e) =>
            e.pin === pin &&
            e.branch === branch &&
            e.status === "active" &&
            e.role === "Kasir", // Only cashiers can use PIN for shifts
        ) || null
      );
    },
    [employees],
  );

  const setActiveEmployee = useCallback((emp: ActiveEmployee | null) => {
    setActiveEmployeeState(emp);
    if (emp) {
      localStorage.setItem("bestea-active-employee", JSON.stringify(emp));
    } else {
      localStorage.removeItem("bestea-active-employee");
    }
  }, []);

  const clearActiveEmployee = useCallback(() => {
    setActiveEmployeeState(null);
    localStorage.removeItem("bestea-active-employee");
  }, []);

  const getEmployeesByBranch = useCallback(
    (branch: string) => {
      if (!branch || branch === "Semua Cabang") return employees;
      return employees.filter((e) => e.branch === branch);
    },
    [employees],
  );

  const clockIn = useCallback(
    async (employeeId: string, shift: string) => {
      const employee = employees.find((e) => e.id === employeeId);
      if (!employee) return;

      const { error } = await supabase.from("attendance_records").insert({
        employee_id: employeeId,
        branch_id: employee.branchId,
        date: new Date().toISOString().split("T")[0],
        check_in: new Date().toISOString(),
        status: "Hadir",
        shift: shift,
      });

      if (error) throw error;
      await fetchAttendance();
    },
    [employees, fetchAttendance],
  );

  const clockOut = useCallback(
    async (employeeId: string) => {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("attendance_records")
        .update({ check_out: new Date().toISOString() })
        .eq("employee_id", employeeId)
        .eq("date", today)
        .is("check_out", null);

      if (error) throw error;
      await fetchAttendance();
    },
    [fetchAttendance],
  );

  const addAttendanceManual = useCallback(
    async (record: Omit<AttendanceRecord, "id">) => {
      const employee = employees.find((e) => e.id === record.employeeId);

      const { error } = await supabase.from("attendance_records").insert({
        employee_id: record.employeeId,
        branch_id: employee?.branchId,
        date: record.date,
        check_in: record.checkIn
          ? new Date(`${record.date}T${record.checkIn}`).toISOString()
          : null,
        check_out: record.checkOut
          ? new Date(`${record.date}T${record.checkOut}`).toISOString()
          : null,
        status: record.status,
        shift: record.shift,
      });

      if (error) throw error;
      await fetchAttendance();
    },
    [employees, fetchAttendance],
  );

  const addPayroll = useCallback(
    async (record: Omit<PayrollRecord, "id">) => {
      const { error } = await supabase.from("payroll_records").insert({
        employee_id: record.employeeId,
        month: record.month,
        hours_worked: record.hoursWorked,
        base_salary: record.baseSalary,
        hourly_rate: record.hourlyRate,
        total_salary: record.totalSalary,
        status: record.status,
      });

      if (error) throw error;
      await fetchPayroll();
    },
    [fetchPayroll],
  );

  const markPayrollPaid = useCallback(
    async (payrollId: string) => {
      const { error } = await supabase
        .from("payroll_records")
        .update({ status: "Paid", paid_at: new Date().toISOString() })
        .eq("id", payrollId);

      if (error) throw error;
      await fetchPayroll();
    },
    [fetchPayroll],
  );

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        activeEmployee,
        attendanceRecords,
        payrollRecords,
        isLoading,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        refreshEmployees: fetchEmployees,
        verifyPin,
        setActiveEmployee,
        clearActiveEmployee,
        resetPin,
        getEmployeesByBranch,
        clockIn,
        clockOut,
        addAttendanceManual,
        markPayrollPaid,
        addPayroll,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployee must be used within an EmployeeProvider");
  }
  return context;
}
