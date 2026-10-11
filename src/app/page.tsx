"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { OverviewData } from "@/types";
import { AlertTriangle, Send } from "lucide-react";

export default function AIStaffManagementPage() {
  const router = useRouter();
  const { user, tenant, loading: authLoading } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getOverview();
      setData(res);
    } catch (err) {
      console.error("Failed to load staff overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Загрузка ИИ-штата...
          </span>
        </div>
      </div>
    );
  }

  const tenantId = data?.tenant_id || tenant?.id || "demo_amo";
  const isTgSubscribed = data?.telegram_bot?.has_subscribers ?? false;

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-5xl mx-auto">
      {/* Simplified Telegram Alert */}
      {!isTgSubscribed && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">
              Напишите Вере в телеграм, чтобы вы были на связи
            </span>
          </div>
          <a
            href={`https://t.me/altai_optima_vera_bot?start=tenant_${tenantId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Написать</span>
          </a>
        </div>
      )}

      {/* Staff Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          ИИ-Штат
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Автономные цифровые сотрудники компании
        </p>
      </div>

      {/* Active Employee: Vera */}
      <Link
        href="/vera"
        className="floating-halo-card relative block rounded-3xl transition-transform duration-300 hover:-translate-y-1 group cursor-pointer"
      >
        <div className="relative z-10 rounded-3xl border border-sky-400/25 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 h-full transition-all">
          <img
            src="/avatar_eva_corpse.webp"
            alt="Вера"
            className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover object-top shadow-md flex-shrink-0"
          />
          <div className="text-center sm:text-left space-y-2 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Вера
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
              ИИ-продавец. Квалифицирует входящих клиентов во всех мессенджерах по методологии BANT, консультирует по каталогу и передает готовые заявки в CRM 24/7.
            </p>
          </div>
        </div>
      </Link>

      {/* Inactive Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mark */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 p-6 space-y-2">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Марк</h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            SMM-маркетолог. Генерирует и выкладывает цепляющий медиа-контент.
          </p>
        </div>

        {/* Igor */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 p-6 space-y-2">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Игорь</h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Программист. Делает сайты и интеграции.
          </p>
        </div>

        {/* Anton */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 p-6 space-y-2">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Антон</h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Ищет потенциальных клиентов для вашего бизнеса.
          </p>
        </div>
      </div>
    </div>
  );
}
