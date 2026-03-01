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
  const { userRole, isLoading } = useBranch();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Don't act while still hydrating context
      if (isLoading) return;

      // 1. Not logged in
      if (userRole === "guest" || !userRole) {
        if (pathname !== "/login") {
          router.push("/login");
        }
        return;
      }

      // 3. Logged in, check if allowed
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        if (userRole === "cashier") {
          router.push("/kasir");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      setIsAuthorized(true);
    };

    checkAuth();
  }, [router, pathname, allowedRoles, userRole, isLoading]);

  // While checking or loading from context, show nothing
  if (isLoading || !isAuthorized) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
