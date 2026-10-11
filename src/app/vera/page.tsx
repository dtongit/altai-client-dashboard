"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import { OverviewData } from "@/types";
import { MetricCard } from "@/components/metric-card";
import { ChannelBadge } from "@/components/channel-badge";
import {
  MessageSquare,
  Flame,
  Zap,
  PiggyBank,
  TrendingUp,
  Cpu,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VeraOverviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingTg, setCheckingTg] = useState(false);
  const [tgConnected, setTgConnected] = useState<boolean | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOverview();
      setData(res);
      if (res.telegram_bot) {
        setTgConnected(res.telegram_bot.has_subscribers);
      }
    } catch (err) {
      console.error("Failed to load overview data:", err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные с сервера");
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
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Загрузка показателей Веры...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 text-center space-y-4 shadow-lg">
          <div className="mx-auto w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Не удалось загрузить данные</h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{error || "Сервер временно недоступен"}</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition-colors shadow-md shadow-amber-500/20"
          >
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  const { kpis, channel_breakdown, daily_timeline } = data;
  const isTgSubscribed = tgConnected ?? (data.telegram_bot?.has_subscribers ?? false);

  // Exclude simulator and aitest from channel breakdown defensively
  const filteredChannels = Object.entries(channel_breakdown).filter(
    ([ch]) => !["simulator", "web_simulator", "aitest"].includes(ch.toLowerCase())
  );

  const tooltipBg = resolvedTheme === "dark" ? "#18181b" : "#ffffff";
  const tooltipBorder = resolvedTheme === "dark" ? "#27272a" : "#e4e4e7";
  const tooltipTextColor = resolvedTheme === "dark" ? "#ffffff" : "#09090b";
  const axisColor = resolvedTheme === "dark" ? "#71717a" : "#a1a1aa";

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* High-priority Action Banner: Telegram Bot Recipients Not Connected */}
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
                    Настройка уведомлений
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Подключите Telegram-бота Веры для получения лидов
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

      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-zinc-50 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 p-6 sm:p-8 shadow-sm dark:shadow-xl transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Сводка эффективности
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">{data.business_name}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              ИИ-продавец Вера на связи
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Автономная квалификация входящего потока клиентов, мгновенные консультации по каталогу и автоматическая передача горячих лидов в вашу CRM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/chats"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Открыть живые диалоги</span>
            </Link>
          </div>
        </div>

        {/* Ambient background accent */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Входящие диалоги"
          value={formatNumber(kpis.total_conversations)}
          subtitle={`Сегодня новых: +${kpis.today_conversations} клиентов`}
          icon={MessageSquare}
          accent="blue"
        />

        <MetricCard
          title="Квалифицировано лидов (BANT)"
          value={formatNumber(kpis.qualified_leads)}
          subtitle={`Конверсия в заявку: ${kpis.conversion_rate_pct}%`}
          icon={Flame}
          trend={`+${kpis.conversion_rate_pct}%`}
          accent="amber"
        />

        <MetricCard
          title="Скорость ответа (TTFT)"
          value={`${(kpis.average_latency_ms / 1000).toFixed(1)} сек`}
          subtitle="В 30 раз быстрее штатного менеджера"
          icon={Zap}
          trend="Мгновенно"
          accent="emerald"
        />

        <MetricCard
          title="Экономия на ФОТ"
          value={formatCurrency(kpis.estimated_payroll_saved_rub)}
          subtitle={`Себестоимость ИИ: ${formatCurrency(kpis.estimated_cost_rub)}`}
          icon={PiggyBank}
          trend="Выгода 3x"
          accent="purple"
        />
      </div>

      {/* Analytics Charts & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Динамика обращений за 7 дней
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Количество сообщений и уникальных клиентских сессий
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>Стабильный поток</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={(val) => {
                    const parts = val.split("-");
                    return `${parts[2]}.${parts[1]}`;
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: tooltipTextColor,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Сообщений"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMsgs)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channels Breakdown */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Распределение по каналам
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Активность входящих запросов в подключенных источниках
            </p>

            <div className="mt-6 space-y-4">
              {filteredChannels.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Пока нет входящих сообщений в боевых каналах
                </div>
              ) : (
                filteredChannels.map(([ch, count]) => {
                  const total = kpis.total_messages || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={ch} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <ChannelBadge channel={ch} />
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {count} сообщ. ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
