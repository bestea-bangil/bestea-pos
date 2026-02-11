"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBranch, RoleType } from "@/contexts/branch-context";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userRole } = useBranch();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // If context is strictly loading, wait?
    // Actually BranchContext sets isLoaded=true after mounting and reading storage.
    // We should wait for that.

    // Check localStorage directly for faster initial check to avoid flash?
    // But BranchContext is the source of truth for app state.
    // Let's rely on BranchContext but maybe add a local check if needed.

    const checkAuth = () => {
      const storedAuth = localStorage.getItem("bestea-auth-session");

      // No session? -> Login
      if (!storedAuth) {
        if (pathname !== "/login") {
          router.push("/login");
        }
        return;
      }

      let role: RoleType = "guest"; // BETTER DEFAULT
      try {
        const parsed = JSON.parse(storedAuth);
        role = parsed.role;
      } catch (e) {
        router.push("/login");
        return;
      }

      // If role is guest (invalid session), force login
      if (role === "guest") {
        if (pathname !== "/login") {
          router.push("/login");
        }
        return;
      }

      // If allowedRoles is specified, check if user has role
      if (allowedRoles && !allowedRoles.includes(role)) {
        // Unauthorized for this specific page
        // Redirect based on their actual role
        if (role === "cashier") {
          router.push("/kasir");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Authorized
      setIsAuthorized(true);
    };

    // Run check
    checkAuth();
  }, [router, pathname, allowedRoles, userRole]);

  // While checking, show nothing or loading
  if (!isAuthorized) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
