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
    employee?: { id: string; name: string; role: string; branch: string };
  }>;
  logout: () => void;
  isSuperAdmin: boolean;
  isBranchAdmin: boolean;
  isCashier: boolean;
}

const AUTH_KEY = "bestea-auth-session";

const BranchContext = React.createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = React.useState<Branch | null>(null);
  const [userRole, setUserRole] = React.useState<RoleType>("guest");
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch branches from Supabase
  const fetchBranches = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");

      if (error) throw error;

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
      console.error("Error fetching branches:", error);
      return [];
    }
  }, []);

  // Load initial data
  React.useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Fetch branches from Supabase
      const loadedBranches = await fetchBranches();

      // Restore session from localStorage
      const savedSession = localStorage.getItem(AUTH_KEY);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setUserRole(session.role);
          if (session.branchId && loadedBranches.length > 0) {
            const branch = loadedBranches.find(
              (b) => b.id === session.branchId,
            );
            if (branch) {
              setCurrentBranch(branch);
            }
          }
        } catch (e) {
          console.error("Failed to parse auth session", e);
        }
      }

      setIsLoading(false);
    };

    init();
  }, [fetchBranches]);

  // Save auth session to localStorage
  React.useEffect(() => {
    if (!isLoading && currentBranch) {
      const session = {
        role: userRole,
        branchId: currentBranch.id,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));

      // Sync with kasir branch key
      if (currentBranch.type === "cabang") {
        localStorage.setItem(
          "bestea-kasir-branch",
          JSON.stringify(currentBranch),
        );
      }
    }
  }, [userRole, currentBranch, isLoading]);

  // Subscribe to realtime changes
  React.useEffect(() => {
    const channel = supabase
      .channel("branches-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branches" },
        () => {
          fetchBranches();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBranches]);

  const addBranch = React.useCallback(
    async (branchData: Omit<Branch, "id">) => {
      const { error } = await supabase.from("branches").insert({
        name: branchData.name,
        type: branchData.type,
        email: branchData.email,
        address: branchData.address,
        phone: branchData.phone,
      });

      if (error) {
        console.error("Error adding branch:", error);
        throw error;
      }

      await fetchBranches();
    },
    [fetchBranches],
  );

  const updateBranch = React.useCallback(
    async (updatedBranch: Branch) => {
      const { error } = await supabase
        .from("branches")
        .update({
          name: updatedBranch.name,
          type: updatedBranch.type,
          email: updatedBranch.email,
          address: updatedBranch.address,
          phone: updatedBranch.phone,
        })
        .eq("id", updatedBranch.id);

      if (error) {
        console.error("Error updating branch:", error);
        throw error;
      }

      await fetchBranches();
    },
    [fetchBranches],
  );

  const deleteBranch = React.useCallback(
    async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);

      if (error) {
        console.error("Error deleting branch:", error);
        throw error;
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
        console.log("[Login] Attempting login for:", email);

        // 1. Check for Admin (super_admin role in employees table)
        const { data: adminData, error: adminError } = await supabase
          .from("employees")
          .select("*, branches(*)")
          .eq("email", email)
          .eq("role", "super_admin")
          .eq("status", "active")
          .maybeSingle();

        console.log("[Login] Admin query result:", { adminData, adminError });

        if (adminData && adminData.pin === pass) {
          // Get branch from join or find in local state
          const branchData = adminData.branches as DBBranch | null;
          const branch: Branch = branchData
            ? {
                id: branchData.id,
                name: branchData.name,
                type: branchData.type as BranchType,
                email: branchData.email,
                address: branchData.address,
                phone: branchData.phone,
              }
            : branches.find((b) => b.type === "admin") || branches[0];

          if (branch) {
            setUserRole("super_admin");
            setCurrentBranch(branch);

            localStorage.setItem(
              "bestea-active-employee",
              JSON.stringify({
                id: adminData.id,
                name: adminData.name,
                role: adminData.role,
              }),
            );

            return {
              success: true,
              role: "super_admin" as RoleType,
              branch: branch,
              employee: {
                id: adminData.id,
                name: adminData.name,
                role: adminData.role,
                branch: branch.name,
              },
            };
          }
        }

        // 2. Check for Cashier/Employee (email + PIN)
        const { data: employeeData, error: empError } = await supabase
          .from("employees")
          .select("*, branches(*)")
          .eq("email", email)
          .eq("pin", pass)
          .eq("status", "active")
          .maybeSingle();

        console.log("[Login] Employee query result:", {
          employeeData,
          empError,
        });

        if (employeeData) {
          const branchData = employeeData.branches as DBBranch | null;
          const branch: Branch | null = branchData
            ? {
                id: branchData.id,
                name: branchData.name,
                type: branchData.type as BranchType,
                email: branchData.email,
                address: branchData.address,
                phone: branchData.phone,
              }
            : branches.find((b) => b.id === employeeData.branch_id) || null;

          if (branch) {
            const role =
              employeeData.role === "branch_admin" ? "branch_admin" : "cashier";
            setUserRole(role as RoleType);
            setCurrentBranch(branch);

            localStorage.setItem(
              "bestea-active-employee",
              JSON.stringify({
                id: employeeData.id,
                name: employeeData.name,
                role: employeeData.role,
              }),
            );

            return {
              success: true,
              role: role as RoleType,
              branch: branch,
              employee: {
                id: employeeData.id,
                name: employeeData.name,
                role: employeeData.role,
                branch: branch.name,
              },
            };
          } else {
            return { success: false, error: "Cabang karyawan tidak ditemukan" };
          }
        }

        return { success: false, error: "Email atau PIN tidak ditemukan" };
      } catch (error) {
        console.error("[Login] Error:", error);
        return { success: false, error: "Terjadi kesalahan saat login" };
      }
    },
    [branches],
  );

  const logout = React.useCallback(() => {
    setUserRole("guest");
    setCurrentBranch(null);
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
    }),
    [
      currentBranch,
      branches,
      isLoading,
      userRole,
      addBranch,
      updateBranch,
      deleteBranch,
      getBranchById,
      fetchBranches,
      login,
      logout,
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
