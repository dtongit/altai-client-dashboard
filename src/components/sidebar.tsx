"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  MessageSquare,
  Sliders,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  ArrowLeft,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAttentionCount } from "@/lib/use-attention-count";
import { VeraFace } from "@/components/vera-face";

const navigation: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }>; vera?: boolean; cap?: string; admin?: boolean }> = [
  { name: "Дашборд", href: "/vera", icon: BarChart3, vera: true, cap: "dashboards" },
  { name: "Чаты", href: "/chats", icon: MessageSquare, vera: true },
  { name: "Пообщаться с Верой", href: "/vera-chat", icon: VeraFace, vera: true },
  { name: "Выключатели", href: "/settings", icon: Sliders, cap: "settings" },
  { name: "Инструкции для Веры", href: "/knowledge", icon: BookOpen, cap: "instructions" },
  { name: "Команда и доступы", href: "/team", icon: UsersRound, cap: "manage_users" },
  // Superadmins: talk to the customer-facing Vera of the current company (the former «Пообщаться с Верой»).
  { name: "Тест клиентской Веры", href: "/simulator", icon: FlaskConical, vera: true, admin: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { can, hasEmployee, user, singleEmployee } = useAuth();
  const attentionCount = useAttentionCount();
  const cleanPath = (pathname || "").replace(/\/+$/, "") || "/";

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-4 min-h-[calc(100dvh-var(--app-top))] transition-colors">
      <div className="space-y-5">
        {/* Switcher back to All AI Staff (not for a user who has only this AI employee) */}
        {!singleEmployee && (
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            title="Вернуться к общему списку ИИ-сотрудников"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Все сотрудники</span>
          </Link>
        </div>
        )}

        {/* Selected Employee Profile Header */}
        <div className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Сотрудник
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              В сети
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <img
              src="/avatar_eva_face.webp"
              alt="Вера"
              className="h-8 w-8 rounded-full object-cover object-top border border-amber-500/40 shadow-sm flex-shrink-0"
            />
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white leading-none">
                Вера
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                ИИ-продавец
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
            Разделы сотрудника
          </p>
          <nav className="space-y-1">
            {navigation
              .filter((item) => (!item.vera || hasEmployee("vera")) && (!item.cap || can(item.cap)) && (!item.admin || Boolean(user?.is_admin)))
              .map((item) => {
              const isActive =
                item.href === "/vera"
                  ? cleanPath === "/vera" || cleanPath.startsWith("/vera/")
                  : cleanPath.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                  {item.href === "/chats" && attentionCount > 0 && (
                    <span className="ml-auto flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                      {attentionCount > 99 ? "99+" : attentionCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Live System Quality Badge */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-4 transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Стандарт Ritz-Carlton
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Вера соблюдает благородную осанку, вежливость и выявляет потребности BANT 24/7.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>Конверсия выше на ~35%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

