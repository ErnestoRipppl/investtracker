"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      if (pathname !== "/login") {
        router.push("/login");
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Prevent flash of protected content on public routes like /login
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#090e1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
