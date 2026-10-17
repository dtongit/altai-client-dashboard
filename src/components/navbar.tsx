"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const { user, tenant, availableTenants, switchTenant, toggleActive, logout } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = tenant?.is_active ?? true;
  const isVeraSelected = pathname !== "/" && pathname !== "/login" && !pathname.startsWith("/admin");

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleActive(!isActive);
    setIsToggling(false);
    setShowConfirm(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Business Name Partnership */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <Link href="/" className="flex items-center gap-2" title="Главная — Управление ИИ-штатом">
              <img
                src="/brand_logo.webp"
                alt="ALTAI Optima"
                className="h-6 sm:h-7 w-auto object-contain dark:brightness-110"
              />
            </Link>

            {tenant && (
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-400 dark:text-zinc-600 font-light select-none text-base sm:text-lg">
                  +
                </span>
                {user?.is_admin && availableTenants.length > 1 ? (
                  <div className="relative flex items-center">
                    <select
                      value={tenant.id}
                      onChange={async (e) => {
                        await switchTenant(e.target.value);
                        if (typeof window !== "undefined") {
                          window.location.reload();
                        }
                      }}
                      className="appearance-none pr-6 pl-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-bold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                      title="Переключить активного тенанта (Суперадмин)"
                    >
                      {availableTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.business_name} ({t.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 pointer-events-none absolute right-2" />
                  </div>
                ) : (
                  <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white">
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Superadmin Console Button (Replaces SQLAdmin) */}
            {user?.is_admin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
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
            {isVeraSelected && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isToggling}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm ${
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

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium text-zinc-900 dark:text-white">
                    {user.username}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {user.is_admin
                      ? "Суперадмин"
                      : user.role === "client_admin"
                      ? "Администратор"
                      : "Оператор"}
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
