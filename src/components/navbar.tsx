"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { ROLE_LABELS, formatDateTime } from "@/lib/permissions";
import {
  Power,
  LogOut,
  AlertCircle,
  HelpCircle,
  Database,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, tenant, availableTenants, switchTenant, toggleActive, logout, role, can, hasEmployee } = useAuth();
  const [pausedBy, setPausedBy] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = tenant?.is_active ?? true;
  const isVeraSelected =
    pathname !== "/" &&
    pathname !== "/login" &&
    pathname !== "/login/" &&
    !pathname?.startsWith("/login") &&
    !pathname?.startsWith("/admin");

  const showSwitch = isVeraSelected && can("master_switch") && hasEmployee("vera");
  const canAudit = can("audit_log");

  // Who stopped Vera last: latest `vera.paused` audit entry (only for users who may read the audit log).
  useEffect(() => {
    if (isActive || !canAudit || !tenant) {
      setPausedBy(null);
      return;
    }
    let cancelled = false;
    api
      .getAuditLog({ action: "vera.paused", limit: 1 })
      .then((res) => {
        const e = (res.entries || res.items || [])[0];
        if (!cancelled) setPausedBy(e ? `${e.actor_name || "—"}, ${formatDateTime(e.created_at)}` : null);
      })
      .catch(() => {
        if (!cancelled) setPausedBy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isActive, canAudit, tenant?.id]);

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleActive(!isActive);
    setIsToggling(false);
    setShowConfirm(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Business Name Partnership */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0" title="Главная — Управление ИИ-штатом">
              <img
                src="/brand_logo.webp"
                alt="ALTAI Optima"
                className="h-4 md:h-6 w-auto object-contain dark:hidden"
              />
              <img
                src="/brand_logo_dark.webp"
                alt="ALTAI Optima"
                className="h-4 md:h-6 w-auto object-contain hidden dark:block"
              />
            </Link>

            {tenant && (
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <span className="text-zinc-400 dark:text-zinc-600 font-light select-none text-sm sm:text-lg shrink-0">
                  +
                </span>
                {/* On mobile: truncated business name */}
                <span className="md:hidden text-sm font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {tenant.business_name}
                </span>

                {/* On desktop: company switcher if multiple, else business name */}
                {availableTenants.length > 1 ? (
                  <div className="relative hidden md:flex items-center">
                    <select
                      value={tenant.id}
                      onChange={async (e) => {
                        await switchTenant(e.target.value);
                        if (typeof window !== "undefined") {
                          window.location.reload();
                        }
                      }}
                      className="appearance-none pr-7 pl-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base font-bold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                      title="Переключить компанию"
                    >
                      {availableTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {user?.is_admin ? `${t.business_name} (${t.id})` : t.business_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 pointer-events-none absolute right-2" />
                  </div>
                ) : (
                  <span className="hidden md:inline-block text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                    {tenant.business_name}
                  </span>
                )}
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                  ИИ-Штат
                </span>
              </div>
            )}
          </div>

          {/* Right: Superadmin Console, Master Kill Switch, Theme Toggle & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Superadmin Console Button (Replaces SQLAdmin) */}
            {user?.is_admin && (
              <Link
                href="/admin"
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-md shadow-amber-500/20"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                }`}
                title="Суперадмин-консоль БД и системы (SQLAdmin)"
              >
                <Database className="h-3.5 w-3.5" />
                <span className="hidden md:inline">СУПЕРАДМИН / БД</span>
              </Link>
            )}

            {/* Global Master Pause/Resume Button - only when Vera is selected */}
            {showSwitch && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isToggling}
                className={`hidden md:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm ${
                  isActive
                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-600/40"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-400 dark:border-amber-600/40"
                }`}
                title="Нажмите для экстренной паузы или включения ИИ-продавца во всех каналах"
              >
                <Power
                  className={`h-3.5 w-3.5 ${
                    isActive
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                />
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isActive
                        ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                        : "bg-amber-500 dark:bg-amber-400"
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isActive ? "Вера активна" : "ИИ на паузе"}
                  </span>
                </span>
              </button>
            )}
            {showSwitch && !isActive && pausedBy && (
              <span className="hidden md:inline text-[11px] text-amber-700 dark:text-amber-400 max-w-[14rem] truncate" title={`Остановлена: ${pausedBy}`}>
                Остановлена: {pausedBy}
              </span>
            )}


            {/* Support Link */}
            <a
              href="https://t.me/altaioptima"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Поддержка 24/7</span>
            </a>

            {/* Theme Toggle Button (hidden on phone, available in "Ещё") */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium text-zinc-900 dark:text-white">
                    {user.username}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {role ? ROLE_LABELS[role] : ""}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  title="Выйти из кабинета"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Master Switch */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  isActive
                    ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                }`}
              >
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {isActive
                    ? "Приостановить ИИ-продавца?"
                    : "Возобновить работу ИИ-продавца?"}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {isActive
                    ? "Все входящие сообщения от клиентов по-прежнему будут сохраняться в системе и CRM, но Вера перестанет автоматически отвечать клиентам во всех каналах."
                    : "Вера снова начнет мгновенно отвечать клиентам, консультировать по товарам и квалифицировать заявки."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                  isActive
                    ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-amber-500/20"
                    : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950 shadow-emerald-500/20"
                }`}
              >
                {isActive ? "Поставить на паузу" : "Включить автоответы"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
