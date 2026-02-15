"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Branch as DBBranch,
  Employee as DBEmployee,
} from "@/lib/supabase/types";

// Types
export type BranchType = "admin" | "cabang";
export type RoleType = "super_admin" | "branch_admin" | "cashier" | "guest";

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  email?: string;
  address?: string;
  phone?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  branch: string;
  email?: string;
  pin?: string;
  branchId?: string;
  avatar_url?: string;
}

interface BranchContextType {
  currentBranch: Branch | null;
  branches: Branch[];
  isLoading: boolean;
  setCurrentBranch: (branch: Branch) => void;
  addBranch: (branch: Omit<Branch, "id">) => Promise<void>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  getBranchById: (id: string) => Branch | undefined;
  refreshBranches: () => Promise<Branch[]>;
  // Auth
  isAdmin: boolean;
  userRole: RoleType;
  setUserRole: (role: RoleType) => void;
  login: (
    email: string,
    pass: string,
  ) => Promise<{
    success: boolean;
    role?: RoleType;
    branch?: Branch;
    error?: string;
    employee?: Employee;
  }>;
  logout: () => void;
  activeEmployee: Employee | null;
  setActiveEmployee: (employee: Employee | null) => void;
  isSuperAdmin: boolean;
  isBranchAdmin: boolean;
  isCashier: boolean;
  // Attendance
  checkAttendanceStatus: (employeeId: string) => Promise<any>;
  clockIn: (
    employeeId: string,
    branchId: string,
    shift?: string,
    status?: string,
  ) => Promise<any>;
  clockOut: (employeeId: string, status?: string) => Promise<any>;
  // Employee Management
  employees: Employee[];
  refreshEmployees: () => Promise<void>;
  verifyPassword: (password: string) => Promise<Employee | null>;
}

const AUTH_KEY = "bestea-auth-session";

const BranchContext = React.createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = React.useState<Branch | null>(null);
  const [userRole, setUserRole] = React.useState<RoleType>("guest");
  const [activeEmployee, setActiveEmployee] = React.useState<Employee | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // 1. Restore Active Employee (for display)
    const storedEmp = localStorage.getItem("bestea-active-employee");
    if (storedEmp) {
      try {
        setActiveEmployee(JSON.parse(storedEmp));
      } catch (e) {
        console.error("Failed to parse active employee", e);
      }
    }

    // 2. Restore Session (Role & Branch for sidebar/auth)
    const storedSession = localStorage.getItem(AUTH_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        if (session.role) setUserRole(session.role as RoleType);
        if (session.branchId) {
          // We can't set full branch object yet because branches might not be loaded
          // But we can trigger a fetch or wait for branches
          // For now, let's at least set the role so the sidebar works.
          // Ideally we match the branch ID with loaded branches.
        }
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }
  }, []);

  // Effect to sync currentBranch when branches are loaded and we have a session branchId
  React.useEffect(() => {
    const storedSession = localStorage.getItem(AUTH_KEY);
    if (storedSession && branches.length > 0 && !currentBranch) {
      try {
        const session = JSON.parse(storedSession);
        if (session.branchId) {
          const found = branches.find((b) => b.id === session.branchId);
          if (found) setCurrentBranch(found);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [branches, currentBranch]);

  // Fetch branches from API
  const fetchBranches = React.useCallback(async () => {
    try {
      const response = await fetch("/api/branches");
      if (!response.ok) throw new Error("Failed to fetch branches");

      const data = await response.json();

      const formattedBranches: Branch[] = (data || []).map((b: DBBranch) => ({
        id: b.id,
        name: b.name,
        type: b.type as BranchType,
        email: b.email,
        address: b.address,
        phone: b.phone,
      }));

      setBranches(formattedBranches);
      return formattedBranches;
    } catch (error) {
      console.error("Error fetching branches (offline?):", error);
      // If we have cached branches in PWA/Server Worker, they would be returned by fetch.
      // If fetch failed completely (NetworkError and no cache), we stay with empty branches or existing state.
      return [];
    }
  }, []);

  // Fetch branches on mount
  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // ...

  const addBranch = React.useCallback(
    async (branchData: Omit<Branch, "id">) => {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error adding branch:", error);
        throw new Error(error.error || "Failed to add branch");
      }

      await fetchBranches();
    },
    [fetchBranches],
  );

  const updateBranch = React.useCallback(
    async (updatedBranch: Branch) => {
      const response = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBranch),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error updating branch:", error);
        throw new Error(error.error || "Failed to update branch");
      }

      await fetchBranches();
    },
    [fetchBranches],
  );

  const deleteBranch = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/branches?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error deleting branch:", error);
        throw new Error(error.error || "Failed to delete branch");
      }

      await fetchBranches();
    },
    [fetchBranches],
  );

  const getBranchById = React.useCallback(
    (id: string) => branches.find((b) => b.id === id),
    [branches],
  );

  const login = React.useCallback(
    async (email: string, pass: string) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass }),
        });

        const result = await response.json();

        if (!response.ok) {
          return { success: false, error: result.error || "Gagal login" };
        }

        const { role, employee, branches: employeeBranches } = result;

        // Logic to determine branch
        let branch: Branch | null = null;

        if (role === "super_admin") {
          // For super_admin, try to use assigned branch or fallback to first available
          const branchData = employeeBranches as DBBranch | null;
          branch = branchData
            ? {
                id: branchData.id,
                name: branchData.name,
                type: branchData.type as BranchType,
                email: branchData.email,
                address: branchData.address,
                phone: branchData.phone,
              }
            : branches.find((b) => b.type === "admin") || branches[0];
        } else {
          // For others, use assigned branch or find by ID
          const branchData = employeeBranches as DBBranch | null;
          branch = branchData
            ? {
                id: branchData.id,
                name: branchData.name,
                type: branchData.type as BranchType,
                email: branchData.email,
                address: branchData.address,
                phone: branchData.phone,
              }
            : branches.find((b) => b.id === employee.branch_id) || null;
        }

        if (branch) {
          setUserRole(role as RoleType);
          setCurrentBranch(branch);

          const empData = {
            id: employee.id,
            name: employee.name,
            role: employee.role,
            branch: branch.name,
            branchId: branch.id,
            email: employee.email,
            avatar_url: employee.avatar_url,
          };
          setActiveEmployee(empData);

          localStorage.setItem(
            "bestea-active-employee",
            JSON.stringify(empData),
          );

          // Save session for AuthGuard
          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify({
              role,
              branchId: branch.id,
              employeeId: employee.id,
            }),
          );

          return {
            success: true,
            role: role as RoleType,
            branch: branch,
            employee: empData,
          };
        } else {
          return { success: false, error: "Cabang karyawan tidak ditemukan" };
        }
      } catch (error) {
        console.error("[Login] Error:", error);
        return { success: false, error: "Terjadi kesalahan saat login" };
      }
    },
    [branches],
  );

  const checkAttendanceStatus = React.useCallback(
    async (employeeId: string) => {
      try {
        const res = await fetch(
          `/api/attendance?checkStatus=true&employeeId=${employeeId}`,
        );
        if (res.ok) {
          const data = await res.json();
          return data; // Returns record if clocked in, null if not
        }
        return null;
      } catch (error) {
        console.error("Error checking attendance:", error);
        return null;
      }
    },
    [],
  );

  const clockIn = React.useCallback(
    async (
      employeeId: string,
      branchId: string,
      shift: string = "Pagi",
      status: string = "Hadir",
    ) => {
      try {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            branchId,
            shift,
            status, // Can be "Hadir" or "Terlambat"
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to clock in");
        return data;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  const clockOut = React.useCallback(
    async (employeeId: string, status?: string) => {
      try {
        const res = await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clock_out", employeeId, status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to clock out");
        return data;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  // Employee Management
  const [employees, setEmployees] = React.useState<Employee[]>([]);

  const fetchEmployees = React.useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data: Employee[] = await res.json();
        setEmployees(data);
        localStorage.setItem("bestea-employees-cache", JSON.stringify(data));

        // Sync activeEmployee with latest data from DB
        const storedEmp = localStorage.getItem("bestea-active-employee");
        if (storedEmp) {
          const parsed = JSON.parse(storedEmp);
          const latest = data.find((e) => e.id === parsed.id);
          if (latest) {
            // ...
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch employees (offline?)", e);
      // Try load from cache
      const cached = localStorage.getItem("bestea-employees-cache");
      if (cached) {
        try {
          setEmployees(JSON.parse(cached));
        } catch (err) {}
      }
    }
  }, [activeEmployee]);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const verifyPassword = React.useCallback(
    async (password: string): Promise<Employee | null> => {
      try {
        const res = await fetch("/api/auth/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          const employee = await res.json();
          return employee;
        }
        throw new Error("API Failed");
      } catch (e) {
        console.error("Verify Password error / Offline", e);
        // Fallback to local check
        const cached = localStorage.getItem("bestea-employees-cache");
        if (cached) {
          try {
            const employees: Employee[] = JSON.parse(cached);
            // NOTE: This assumes 'pin' is present in the employee object.
            // If API removes it for security, this won't work and we'd need to change API
            // to return a hash or something, but for POS often it's sent.
            // Let's check matching pin.
            // Security Warning: Storing plain PINs in localStorage is risky.
            // But user requested functionality.
            const found = employees.find((e) => e.pin === password);
            if (found) return found;
          } catch (err) {}
        }
        return null; // Return null if both fail
      }
    },
    [],
  );

  const logout = React.useCallback(() => {
    setUserRole("guest");
    setCurrentBranch(null);
    setActiveEmployee(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("bestea-kasir-branch");
    localStorage.removeItem("bestea-active-employee");
  }, []);

  const value = React.useMemo(
    () => ({
      currentBranch,
      branches,
      isLoading,
      setCurrentBranch,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranchById,
      refreshBranches: fetchBranches,
      isAdmin: currentBranch?.type === "admin",
      userRole,
      setUserRole,
      login,
      logout,
      isSuperAdmin: userRole === "super_admin",
      isBranchAdmin: userRole === "branch_admin",
      isCashier: userRole === "cashier",
      activeEmployee,
      setActiveEmployee,
      checkAttendanceStatus,
      clockIn,
      clockOut,
      employees,
      refreshEmployees: fetchEmployees,
      verifyPassword,
    }),
    [
      currentBranch,
      branches,
      isLoading,
      userRole,
      activeEmployee,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranchById,
      fetchBranches,
      login,
      logout,
      checkAttendanceStatus,
      clockIn,
      clockOut,
      employees,
      fetchEmployees,
      verifyPassword,
    ],
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const context = React.useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
