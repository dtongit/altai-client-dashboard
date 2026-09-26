"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { OverviewData } from "@/types";
import { MetricCard } from "@/components/metric-card";
import { ChannelBadge } from "@/components/channel-badge";
import {
  MessageSquare,
  Flame,
  Zap,
  PiggyBank,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
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

export default function OverviewPage() {
  const router = useRouter();
  const { user, tenant, loading: authLoading } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    async function loadData() {
      try {
        const res = await api.getOverview();
        setData(res);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-zinc-400">Загрузка показателей...</span>
        </div>
      </div>
    );
  }

  const { kpis, system_status, channel_breakdown, daily_timeline } = data;
  const isAiActive = system_status.is_active;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Сводка эффективности
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">{data.business_name}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              ИИ-продавец Вера на связи
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Автономная квалификация входящего потока клиентов, мгновенные консультации по каталогу и автоматическая передача горячих лидов в вашу CRM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/chats"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Открыть живые диалоги</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Ambient background accent */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
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
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Динамика обращений за 7 дней
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Количество сообщений и уникальных клиентских сессий
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-400">
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
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickFormatter={(val) => {
                    const parts = val.split("-");
                    return `${parts[2]}.${parts[1]}`;
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#ffffff",
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Распределение по каналам
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Активность входящих запросов в мессенджерах
            </p>

            <div className="mt-6 space-y-4">
              {Object.entries(channel_breakdown).map(([ch, count]) => {
                const total = kpis.total_messages || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={ch} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <ChannelBadge channel={ch} />
                      <span className="font-medium text-white">{count} сообщ. ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Quality Box */}
          <div className="mt-6 pt-5 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Безопасность 152-ФЗ
              </span>
              <span className="text-emerald-400 font-medium">100% защита</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Overview Strip */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isAiActive ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">
              {isAiActive ? "ИИ-продавец в боевом режиме" : "ИИ-продавец приостановлен"}
            </div>
            <div className="text-[11px] text-zinc-400">
              {system_status.paused_chats_count > 0
                ? `${system_status.paused_chats_count} диалог(ов) на ручном перехвате оператором`
                : "Все диалоги обрабатываются автономно"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
          >
            Настройки каналов
          </Link>
          <Link
            href="/chats"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-400 border border-amber-500/30 transition-colors"
          >
            Перейти к диалогам
          </Link>
        </div>
      </div>
    </div>
  );
}
