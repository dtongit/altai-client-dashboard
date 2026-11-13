"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, can, hasEmployee, employeeHome } = useAuth();
  const { showToast } = useToast();
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
  const isChatLink = cleanPath === "/c" || cleanPath.startsWith("/c/");
  const isStartPage =
    cleanPath === "/" || cleanPath === "" || cleanPath === "/index.html";
  const isAdminPage = cleanPath.startsWith("/admin");
  const showSidebar = !isLoginPage && !isStartPage && !isAdminPage && !isChatLink;

  // Page guards (roles epic #75): which capability / AI employee each section needs.
  const needsVera = ["/vera", "/vera-chat", "/chats", "/simulator"].some(
    (p) => cleanPath === p || cleanPath.startsWith(p + "/")
  );
  const needsCap = cleanPath.startsWith("/settings")
    ? "settings"
    : cleanPath.startsWith("/knowledge")
    ? "instructions"
    : cleanPath.startsWith("/team")
    ? "manage_users"
    : null;
  const veraOk = hasEmployee("vera");
  // The Vera dashboard needs `dashboards`; without it the work with Vera starts in the chats (quiet redirect).
  const isVeraDashboard = cleanPath === "/vera" || cleanPath.startsWith("/vera/");
  const noDashboards = Boolean(user) && veraOk && isVeraDashboard && !can("dashboards");
  // «Тест клиентской Веры» (/simulator) is for superadmins only.
  const needsAdmin = cleanPath === "/simulator" || cleanPath.startsWith("/simulator/");
  const adminOk = Boolean(user?.is_admin);
  const denied =
    Boolean(user) && ((needsVera && !veraOk) || (needsCap !== null && !can(needsCap)) || (needsAdmin && !adminOk) || noDashboards);

  useEffect(() => {
    if (!loading && mounted && denied) {
      if (noDashboards) {
        router.replace("/chats");
        return;
      }
      showToast(
        needsVera && !veraOk
          ? "Доступ к Вере закрыт. Обратитесь к менеджеру вашей компании."
          : "Недостаточно прав для этого раздела",
        "error"
      );
      router.replace(veraOk ? employeeHome("vera") : "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, mounted, denied, noDashboards, needsVera, veraOk, router, showToast]);

  useEffect(() => {
    if (!loading && mounted) {
      if (!user && !isLoginPage && !isChatLink) {
        router.replace("/login");
      } else if (user && isLoginPage) {
        router.replace("/");
      }
    }
  }, [loading, mounted, user, isLoginPage, isChatLink, router]);

  // If on the login page or chat link page, render directly without blocking auth
  if (isLoginPage || isChatLink) {
    return (
      <div className={`${isChatLink ? "" : "min-h-screen"} bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors`}>
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

  const isChats = cleanPath.startsWith("/chats");
  const isSimulator = cleanPath.startsWith("/simulator") || cleanPath.startsWith("/vera-chat");

  // The site header (logo + company) shows only on the AI staff list and the superadmin console; elsewhere the page
  // takes the full height and the header's controls live in the sidebar footer (desktop) and «Ещё» (phone).
  const showHeader = isStartPage || isAdminPage;

  return (
    <div
      // Fixed to the viewport: only <main> scrolls, so the sidebar (and its footer) stays in place.
      className="h-dvh flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors"
      style={showHeader ? undefined : ({ "--app-top": "0px" } as React.CSSProperties)}
    >
      {showHeader && <Navbar />}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <main
          className={`flex-1 min-w-0 bg-zinc-100/60 dark:bg-zinc-950/50 ${
            isChats || isSimulator
              ? "overflow-hidden"
              : "overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0"
          }`}
        >
          {denied ? null : children}
        </main>
      </div>
      {showSidebar && <BottomNav />}
    </div>
  );
}

