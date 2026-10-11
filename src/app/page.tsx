"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { OverviewData } from "@/types";
import {
  Users,
  Sparkles,
  MessageSquare,
  Flame,
  Zap,
  ArrowRight,
  AlertTriangle,
  Send,
  RefreshCw,
  Clock,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Headphones,
  UserCheck,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function AIStaffManagementPage() {
  const router = useRouter();
  const { user, tenant, loading: authLoading } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingTg, setCheckingTg] = useState(false);
  const [tgConnected, setTgConnected] = useState<boolean | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getOverview();
      setData(res);
      if (res.telegram_bot) {
        setTgConnected(res.telegram_bot.has_subscribers);
      }
    } catch (err) {
      console.error("Failed to load staff overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTelegram = async () => {
    setCheckingTg(true);
    try {
      const res = await api.getTelegramStatus();
      if (res.ok) {
        setTgConnected(res.has_subscribers);
        if (data) {
          setData({
            ...data,
            telegram_bot: {
              ...(data.telegram_bot || {
                bot_username: "altai_optima_vera_bot",
                bot_url: "https://t.me/altai_optima_vera_bot",
              }),
              has_subscribers: res.has_subscribers,
              subscribers_count: res.subscribers_count,
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to check telegram status:", e);
    } finally {
      setCheckingTg(false);
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
            Загрузка ИИ-штата компании...
          </span>
        </div>
      </div>
    );
  }

  const businessName = data?.business_name || tenant?.business_name || "Ваша компания";
  const isTgSubscribed = tgConnected ?? (data?.telegram_bot?.has_subscribers ?? false);

  const totalConversations = data?.kpis?.total_conversations || 0;
  const qualifiedLeads = data?.kpis?.qualified_leads || 0;
  const avgLatencySec = data?.kpis?.average_latency_ms
    ? (data.kpis.average_latency_ms / 1000).toFixed(1)
    : "1.2";

  return (
    <div className="p-6 sm:p-10 space-y-10 max-w-6xl mx-auto">
      {/* High-priority Action Callout: Telegram Bot Recipients Not Connected */}
      {!isTgSubscribed && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:via-zinc-900 dark:to-orange-950/30 p-6 sm:p-7 shadow-xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 flex-shrink-0 animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                    Требуется действие
                  </span>
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Настройка получателей
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Подключите Telegram-бота Веры для получения горячих лидов
                </h3>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  К боту <span className="font-semibold text-amber-700 dark:text-amber-400">@altai_optima_vera_bot</span> еще не подключился ни один сотрудник вашей компании. Перейдите в бота и нажмите «Старт», чтобы мгновенно получать алерты о горячих клиентах и перехвате диалогов.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:flex-shrink-0">
              <a
                href="https://t.me/altai_optima_vera_bot"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                <span>Подключить @altai_optima_vera_bot</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
              <button
                onClick={handleCheckTelegram}
                disabled={checkingTg}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold transition-colors"
                title="Проверить, зарегистрировались ли сотрудники в боте"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingTg ? "animate-spin" : ""}`} />
                <span>Проверить подключение</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Staff Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <Users className="h-4 w-4" />
            <span>Цифровой персонал</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-zinc-600 dark:text-zinc-400">{businessName}</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Управление ИИ-штатом
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Централизованный портал управления автономными цифровыми сотрудниками Altai Optima. Выберите специалиста для перехода в его персональный кабинет управления, аналитики диалогов и базы знаний.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 self-start md:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Штат: 1 активный специалист</span>
        </div>
      </div>

      {/* Active Employees Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Подключенные сотрудники
          </h2>
          <span className="text-xs text-zinc-400">Нажмите на карточку для перехода в кабинет</span>
        </div>

        {/* Vera's Active Employee Card */}
        <Link
          href="/vera"
          className="group block relative overflow-hidden rounded-3xl border-2 border-amber-500/40 hover:border-amber-500 bg-white dark:bg-zinc-900/80 p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="relative">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-0.5 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center text-amber-400">
                    <Sparkles className="h-8 w-8 text-amber-400" />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-zinc-900 shadow">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Вера
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Сотрудник подключен</span>
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    ИИ-продавец
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  Автономная квалификация входящих клиентов во всех мессенджерах по методологии BANT, консультации по каталогу и моментальная передача теплых лидов в вашу CRM.
                </p>

                {/* Micro KPIs */}
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      Обработано диалогов:{" "}
                      <strong className="text-zinc-900 dark:text-white font-semibold">
                        {formatNumber(totalConversations)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      Горячих лидов:{" "}
                      <strong className="text-zinc-900 dark:text-white font-semibold">
                        {formatNumber(qualifiedLeads)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Zap className="h-3.5 w-3.5 text-emerald-500" />
                    <span>
                      Скорость ответа:{" "}
                      <strong className="text-zinc-900 dark:text-white font-semibold">
                        {avgLatencySec} сек
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA action */}
            <div className="flex items-center gap-3 lg:flex-shrink-0 self-end lg:self-center">
              <span className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 group-hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-all group-hover:translate-x-1">
                <span>Открыть кабинет Веры</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Background subtle glow */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
        </Link>
      </div>

      {/* Upcoming Employees Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Скоро присоединятся к вашей команде
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              В разработке
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Мы обучаем и настраиваем новых специализированных цифровых сотрудников под регламенты вашей компании.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Upcoming: Maxim */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  М
                </div>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Обучение модели</span>
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Максим
                </h4>
                <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  ИИ-оператор 1-й линии поддержки
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Мгновенные консультации действующих клиентов по типовым вопросам, статусам заказов, доставке и FAQ 24/7 без очередей.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-500">
              Скоро будет доступен в вашем штате
            </div>
          </div>

          {/* Upcoming: Anna */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                  А
                </div>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Скоро</span>
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Анна
                </h4>
                <div className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                  ИИ-рекрутер / HR-ассистент
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Первичный скрининг откликов с HeadHunter и мессенджеров, автоматическое анкетирование соискателей и запись на интервью с РОПом.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-500">
              Скоро будет доступен в вашем штате
            </div>
          </div>

          {/* Upcoming: Alexey */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  А
                </div>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Скоро</span>
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Алексей
                </h4>
                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ИИ-аудитор качества диалогов
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Анализ переписок ваших штатных менеджеров на соблюдение скрипта продаж, тональности и стандартов Ritz-Carlton.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-500">
              Скоро будет доступен в вашем штате
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
