"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  Power,
  LogOut,
  Building2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  HelpCircle,
} from "lucide-react";

export function Navbar() {
  const { user, tenant, toggleActive, logout } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = tenant?.is_active ?? true;

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleActive(!isActive);
    setIsToggling(false);
    setShowConfirm(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand & Business Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-zinc-950 shadow-lg shadow-amber-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold tracking-tight text-white flex items-center gap-1.5 text-base">
                  Altai Optima
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Вера
                  </span>
                </span>
                <p className="text-[11px] text-zinc-400 leading-none">
                  Кабинет управления ИИ-продавцом
                </p>
              </div>
            </Link>

            {tenant && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                <span className="font-medium text-white">{tenant.business_name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                  {tenant.crm_type}
                </span>
              </div>
            )}
          </div>

          {/* Right: Master Kill Switch & User Menu */}
          <div className="flex items-center gap-3">
            {/* Global Master Pause/Resume Button */}
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isToggling}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                isActive
                  ? "bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-600/40"
                  : "bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-600/40"
              }`}
              title="Нажмите для экстренной паузы или включения ИИ-продавца во всех каналах"
            >
              <Power className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isActive ? "Вера активна" : "ИИ на паузе"}
              </span>
            </button>

            {/* Support Link */}
            <a
              href="https://t.me/altaioptima"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-900"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Поддержка 24/7</span>
            </a>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-medium text-white">{user.username}</div>
                  <div className="text-[10px] text-zinc-400">
                    {user.role === "client_admin" ? "Администратор" : "Оператор"}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${isActive ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isActive ? "Приостановить ИИ-продавца?" : "Возобновить работу ИИ-продавца?"}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  {isActive
                    ? "Все входящие сообщения от клиентов по-прежнему будут сохраняться в системе и CRM, но Вера перестанет автоматически отвечать клиентам во всех каналах."
                    : "Вера снова начнет мгновенно отвечать клиентам, консультировать по товарам и квалифицировать заявки."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 hover:bg-amber-600 text-zinc-950"
                    : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
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
