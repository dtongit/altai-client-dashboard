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
  const { user, tenant, loading: authLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingTg, setConnectingTg] = useState(false);

  const handleConnectTelegram = async () => {
    setConnectingTg(true);
    try {
      const invite = await api.createTeamInvite("senior");
      if (invite?.invite_url) {
        window.open(invite.invite_url, "_blank");
      }
    } catch (e) {
      console.error("Failed to generate invite link:", e);
    } finally {
      setConnectingTg(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOverview();
      setData(res);
    } catch (err) {
      console.error("Failed to load overview data:", err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные с сервера");
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

  const { kpis: rawKpis, channel_breakdown, daily_timeline: rawTimeline } = data;
  const tenantId = data.tenant_id || tenant?.id || "demo_amo";
  const isTgSubscribed = data.telegram_bot?.has_subscribers ?? false;

  // Defensive filtering: strictly exclude simulators, demos, and testing channels
  const excludedChannels = ["simulator", "web_simulator", "aitest", "landing_demo", "demo"];
  const filteredChannels = Object.entries(channel_breakdown).filter(
    ([ch]) => !excludedChannels.includes(ch.toLowerCase())
  );

  // If there are zero live channel messages/conversations, ensure timeline reflects real live traffic only
  const hasLiveTraffic = filteredChannels.length > 0;
  const daily_timeline = hasLiveTraffic
    ? rawTimeline
    : rawTimeline.map((item) => ({ ...item, conversations: 0, messages: 0 }));

  const kpis = hasLiveTraffic
    ? rawKpis
    : {
        ...rawKpis,
        total_conversations: 0,
        today_conversations: 0,
        qualified_leads: 0,
        conversion_rate_pct: 0,
      };

  const tooltipBg = resolvedTheme === "dark" ? "#18181b" : "#ffffff";
  const tooltipBorder = resolvedTheme === "dark" ? "#27272a" : "#e4e4e7";
  const tooltipTextColor = resolvedTheme === "dark" ? "#ffffff" : "#09090b";
  const axisColor = resolvedTheme === "dark" ? "#71717a" : "#a1a1aa";

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Simplified Telegram Alert */}
      {!isTgSubscribed && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-start sm:items-center gap-3 text-left">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <span className="block text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                Напишите Вере в телеграм, чтобы быть с ней на связи
              </span>
              <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                Вы сможете обсуждать с Верой её задачи и статус. А если что-то случится, Вера сразу вам напишет
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectTelegram}
            disabled={connectingTg}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold shadow-sm transition-all flex-shrink-0 self-stretch sm:self-auto justify-center cursor-pointer"
          >
            {connectingTg ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{connectingTg ? "Подключение..." : "Написать"}</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Вера — ИИ-продавец
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Показатели эффективности, конверсия в заявку и аналитика обращений
        </p>
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
        {/* Main Timeline Chart - True Dialogues only */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Динамика обращений за 7 дней
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Количество реальных клиентских диалогов
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>Живой трафик</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDialogues" x1="0" y1="0" x2="0" y2="1">
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
                  allowDecimals={false}
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
                  formatter={(val: any) => [val, "Живых диалогов"]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="conversations"
                  name="Живых диалогов"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDialogues)"
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
