"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  MessageSquare,
  Sliders,
  BookOpen,
  Send,
  Headphones,
  CheckCircle2,
  Bot,
} from "lucide-react";

const navigation = [
  { name: "Сводка и KPI", href: "/", icon: BarChart3 },
  { name: "Живые диалоги", href: "/chats", icon: MessageSquare },
  { name: "Тренажер Веры", href: "/simulator", icon: Bot },
  { name: "Каналы и статус", href: "/settings", icon: Sliders },
  { name: "База знаний Веры", href: "/knowledge", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Рабочее пространство
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-amber-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Live System Quality Badge */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Стандарт Ritz-Carlton
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
            Вера соблюдает благородную осанку, вежливость и выявляет потребности BANT 24/7.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Конверсия выше на ~35%</span>
          </div>
        </div>
      </div>

      {/* Direct Telegram Support Box */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Headphones className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Ваш менеджер</div>
            <div className="text-[10px] text-zinc-400">Инженер Altai Optima</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          Нужно подключить новый канал или обновить сценарии диалогов?
        </p>
        <a
          href="https://t.me/altaioptima"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-amber-400 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Написать в Telegram</span>
        </a>
      </div>
    </aside>
  );
}
