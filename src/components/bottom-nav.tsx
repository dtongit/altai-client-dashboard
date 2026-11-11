"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BarChart3,
  Bot,
  Menu as MenuIcon,
  Sliders,
  BookOpen,
  UsersRound,
  ArrowLeft,
  Power,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAttentionCount } from "@/lib/use-attention-count";
import { Sheet } from "@/components/ui/Sheet";
import { ThemeToggle } from "@/components/theme-toggle";

export function BottomNav() {
  const pathname = usePathname();
  const cleanPath = (pathname || "").replace(/\/+$/, "") || "/";
  const { user, tenant, availableTenants, switchTenant, toggleActive, logout, can, hasEmployee } = useAuth();
  const attentionCount = useAttentionCount();

  const [moreOpen, setMoreOpen] = useState(false);
  const [hasChatOpenOnPhone, setHasChatOpenOnPhone] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Check if a specific chat session is open on mobile
  useEffect(() => {
    const checkSession = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const hasSession = Boolean(params.get("session"));
        const isMobile = window.innerWidth < 768;
        setHasChatOpenOnPhone(cleanPath.startsWith("/chats") && hasSession && isMobile);
      }
    };

    checkSession();
    window.addEventListener("resize", checkSession);
    window.addEventListener("popstate", checkSession);

    // Small polling/interval or observer for URL changes in SPA
    const interval = setInterval(checkSession, 300);

    return () => {
      window.removeEventListener("resize", checkSession);
      window.removeEventListener("popstate", checkSession);
      clearInterval(interval);
    };
  }, [cleanPath]);

  // Hide on login, /c/, or when a conversation is open full screen on phone
  if (
    cleanPath === "/login" ||
    cleanPath.startsWith("/login/") ||
    cleanPath === "/c" ||
    cleanPath.startsWith("/c/") ||
    hasChatOpenOnPhone
  ) {
    return null;
  }

  const isVeraAllowed = hasEmployee("vera");
  const isActive = tenant?.is_active ?? true;
  const showMasterSwitch = can("master_switch") && isVeraAllowed;

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleActive(!isActive);
    setIsToggling(false);
  };

  const navItems = [
    {
      label: "Чаты",
      href: "/chats",
      icon: MessageSquare,
      badge: attentionCount > 0 ? attentionCount : null,
      visible: isVeraAllowed,
      active: cleanPath.startsWith("/chats"),
    },
    {
      label: "Дашборд",
      href: "/vera",
      icon: BarChart3,
      visible: isVeraAllowed,
      active: cleanPath === "/vera" || cleanPath.startsWith("/vera/"),
    },
    {
      label: "Вера",
      href: "/simulator",
      icon: Bot,
      visible: isVeraAllowed,
      active: cleanPath.startsWith("/simulator"),
    },
  ];

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 h-[calc(56px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2"
      >
        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
                  item.active
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}

        {/* "Ещё" tab */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            moreOpen
              ? "text-amber-600 dark:text-amber-400 font-semibold"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">Ещё</span>
        </button>
      </nav>

      {/* "Ещё" Bottom Sheet */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Меню">
        <div className="space-y-4 py-1">
          {/* Company Switcher if multiple tenants */}
          {tenant && availableTenants.length > 1 && (
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Компания
              </label>
              <div className="relative flex items-center">
                <select
                  value={tenant.id}
                  onChange={async (e) => {
                    await switchTenant(e.target.value);
                    if (typeof window !== "undefined") {
                      window.location.reload();
                    }
                  }}
                  className="w-full appearance-none pr-8 pl-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-base font-semibold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {user?.is_admin ? `${t.business_name} (${t.id})` : t.business_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-zinc-500 pointer-events-none absolute right-3" />
              </div>
            </div>
          )}

          {/* Master Kill Switch on Mobile */}
          {showMasterSwitch && (
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span>{isActive ? "Вера активна" : "ИИ на паузе"}</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isActive ? "Отвечает во всех каналах" : "Автоответы отключены"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                  isActive
                    ? "bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                }`}
              >
                <Power className="h-4 w-4" />
                <span>{isActive ? "Пауза" : "Включить"}</span>
              </button>
            </div>
          )}

          {/* Section links */}
          <div className="space-y-1">
            {can("settings") && (
              <Link
                href="/settings"
                onClick={() => setMoreOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                  cleanPath.startsWith("/settings")
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Sliders className="h-5 w-5 text-zinc-500 shrink-0" />
                <span>Выключатели</span>
              </Link>
            )}

            {can("instructions") && (
              <Link
                href="/knowledge"
                onClick={() => setMoreOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                  cleanPath.startsWith("/knowledge")
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <BookOpen className="h-5 w-5 text-zinc-500 shrink-0" />
                <span>Инструкции для Веры</span>
              </Link>
            )}

            {can("manage_users") && (
              <Link
                href="/team"
                onClick={() => setMoreOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                  cleanPath.startsWith("/team")
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <UsersRound className="h-5 w-5 text-zinc-500 shrink-0" />
                <span>Команда и доступы</span>
              </Link>
            )}

            <Link
              href="/"
              onClick={() => setMoreOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-500 shrink-0" />
              <span>Все ИИ-сотрудники</span>
            </Link>
          </div>

          {/* Theme & Logout */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Тема:</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                logout();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
