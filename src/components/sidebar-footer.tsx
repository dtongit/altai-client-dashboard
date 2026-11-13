"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, Database, HelpCircle, LogOut, Power } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { ROLE_LABELS, formatDateTime } from "@/lib/permissions";

/**
 * Bottom of the desktop sidebar. The site header shows only on the AI staff list (`/`), so on every other page this
 * panel carries what the header had: the company (switcher), the master switch with its confirmation, theme, support,
 * the superadmin console and logout. Phones have the same in the «Ещё» sheet.
 */
export function SidebarFooter() {
  const { user, tenant, availableTenants, switchTenant, toggleActive, logout, role, can, hasEmployee } = useAuth();
  const [pausedBy, setPausedBy] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = tenant?.is_active ?? true;
  const showSwitch = can("master_switch") && hasEmployee("vera");
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
    <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
      {/* Company */}
      {tenant && (
        <div className="px-1">
          {availableTenants.length > 1 ? (
            <div className="relative flex items-center">
              <select
                value={tenant.id}
                onChange={async (e) => {
                  await switchTenant(e.target.value);
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="w-full appearance-none pr-7 pl-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 truncate"
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
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate px-1.5" title={tenant.business_name}>
              {tenant.business_name}
            </div>
          )}
        </div>
      )}

      {/* Master switch */}
      {showSwitch && (
        <div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isToggling}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              isActive
                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-600/40"
                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300/80 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-400 dark:border-amber-600/40"
            }`}
            title="Экстренная пауза или включение Веры во всех каналах"
          >
            <Power className="h-3.5 w-3.5 shrink-0" />
            <span
              className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                isActive ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-amber-500 dark:bg-amber-400"
              }`}
            />
            <span className="truncate">{isActive ? "Вера активна" : "Вера на паузе"}</span>
          </button>
          {!isActive && pausedBy && (
            <div className="mt-1 px-1.5 text-[11px] text-amber-700 dark:text-amber-400 truncate" title={`Остановлена: ${pausedBy}`}>
              Остановлена: {pausedBy}
            </div>
          )}
        </div>
      )}

      {/* User, theme, support, console, logout */}
      {user && (
        <div className="flex items-center gap-1 pl-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">{user.username}</div>
            {role && <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{ROLE_LABELS[role]}</div>}
          </div>
          <ThemeToggle up align="left" />
          <a
            href="https://t.me/altaioptima"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title="Поддержка 24/7"
            aria-label="Поддержка 24/7"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          {user.is_admin && (
            <Link
              href="/admin"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              title="Суперадмин-консоль"
              aria-label="Суперадмин-консоль"
            >
              <Database className="h-4 w-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title="Выйти из кабинета"
            aria-label="Выйти из кабинета"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirmation for the master switch */}
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
                  {isActive ? "Приостановить ИИ-продавца?" : "Возобновить работу ИИ-продавца?"}
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
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
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
    </div>
  );
}
