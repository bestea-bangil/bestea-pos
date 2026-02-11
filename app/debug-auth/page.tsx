"use client";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState } from "react";

export default function DebugAuthPage() {
  const { userRole, isSuperAdmin, isCashier } = useBranch();
  const [storedSession, setStoredSession] = useState("");

  useEffect(() => {
    setStoredSession(
      localStorage.getItem("bestea-auth-session") || "No session",
    );
  }, []);

  return (
    <div className="p-8 bg-white min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Information</h1>

      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold">Branch Context</h2>
          <pre className="bg-gray-100 p-2 rounded mt-2">
            {JSON.stringify(
              {
                userRole,
                isSuperAdmin,
                isCashier,
              },
              null,
              2,
            )}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold">Local Storage Session</h2>
          <pre className="bg-gray-100 p-2 rounded mt-2">{storedSession}</pre>
        </div>
      </div>
    </div>
  );
}
