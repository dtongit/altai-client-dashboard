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
  const { user, loading, can, hasEmployee } = useAuth();
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
  // «Тест клиентской Веры» (/simulator) is for superadmins only.
  const needsAdmin = cleanPath === "/simulator" || cleanPath.startsWith("/simulator/");
  const adminOk = Boolean(user?.is_admin);
  const denied =
    Boolean(user) && ((needsVera && !veraOk) || (needsCap !== null && !can(needsCap)) || (needsAdmin && !adminOk));

  useEffect(() => {
    if (!loading && mounted && denied) {
      showToast(
        needsVera && !veraOk
          ? "Доступ к Вере закрыт. Обратитесь к менеджеру вашей компании."
          : "Недостаточно прав для этого раздела",
        "error"
      );
      router.replace(veraOk ? "/vera" : "/");
    }
  }, [loading, mounted, denied, needsVera, veraOk, router, showToast]);

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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
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

