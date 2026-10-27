"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize path by stripping trailing slashes and handling fallback
  const rawPath =
    pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "") ||
    "/";
  const cleanPath = rawPath.replace(/\/+$/, "") || "/";

  const isLoginPage = cleanPath === "/login" || cleanPath.startsWith("/login");
  const isDemoPage = cleanPath === "/demo" || cleanPath.startsWith("/demo");
  const isStartPage =
    cleanPath === "/" || cleanPath === "" || cleanPath === "/index.html";
  const isAdminPage = cleanPath.startsWith("/admin");
  const showSidebar = !isLoginPage && !isStartPage && !isAdminPage && !isDemoPage;

  useEffect(() => {
    if (!loading && mounted) {
      if (!user && !isLoginPage && !isDemoPage) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [loading, mounted, user, isLoginPage, isDemoPage, router]);

  // If on login or public demo page, render directly without blocking auth
  if (isLoginPage || isDemoPage) {
    return (
      <div
        className={
          isDemoPage
            ? "fixed inset-0 overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
            : "min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors"
        }
      >
        {children}
      </div>
    );
  }

  // While checking auth token from localStorage / server on protected routes
  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Проверка авторизации...
          </span>
        </div>
      </div>
    );
  }

  // Any unauthenticated access to protected pages shows redirecting indicator
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Перенаправление на страницу входа...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto bg-zinc-100/60 dark:bg-zinc-950/50">
          {children}
        </main>
      </div>
    </div>
  );
}

