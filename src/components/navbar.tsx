"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  LogOut,
  HelpCircle,
  Database,
  ChevronDown,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, tenant, availableTenants, switchTenant, logout, role } = useAuth();
  // The header shows only on the AI staff list and the superadmin console (layout-shell); the master switch, which
  // belongs to a selected AI employee, lives in the sidebar footer and the phone «Ещё» sheet.
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
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
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

    </>
  );
}
