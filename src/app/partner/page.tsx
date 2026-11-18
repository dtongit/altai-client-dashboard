"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { PartnerEvent, PartnerChartPoint } from "@/types";
import { formatDayMonth, formatRub, shortMonth, PAYMENT_KIND_LABELS } from "@/lib/partner-format";
import { Card, CountUp, Empty, ErrorBox, Label, Money, Spinner, btnPrimary, useLoad, usePartner } from "@/components/partner/ui";

function RefCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API blocked (insecure context): fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing else to try */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Card className="flex items-center justify-between gap-3 !py-3">
      <div className="min-w-0">
        <Label>Ваш код</Label>
        <div className="pp-num text-xl sm:text-2xl font-bold tracking-wider truncate">{code}</div>
      </div>
      <button type="button" onClick={copy} className={`${btnPrimary} shrink-0`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Скопировано" : "Скопировать"}
      </button>
    </Card>
  );
}

function Chart({ points }: { points: PartnerChartPoint[] }) {
  const totals = points.map((p) => p.launch_kop + p.own_kop + p.team_kop);
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="flex items-end gap-1 sm:gap-2 h-40">
        {points.map((p, i) => {
          const h = (totals[i] / max) * 100;
          const seg = (v: number) => (totals[i] ? `${(v / totals[i]) * 100}%` : "0%");
          return (
            <div key={p.period} className="flex-1 min-w-0 h-full flex flex-col justify-end" title={`${p.period}: ${formatRub(totals[i])}`}>
              <div className="w-full rounded-t-md overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(h, totals[i] ? 3 : 0)}%` }}>
                <div style={{ height: seg(p.own_kop) }} className="bg-[#34D399]" />
                <div style={{ height: seg(p.team_kop) }} className="bg-[#6EE7B7] dark:bg-[#10B981]" />
                <div style={{ height: seg(p.launch_kop) }} className="bg-[var(--pp-accent)]" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 sm:gap-2 mt-1">
        {points.map((p) => (
          <div key={p.period} className="flex-1 min-w-0 text-center text-[9px] sm:text-[10px] text-[var(--pp-muted)] truncate">
            {shortMonth(p.period)}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-[var(--pp-muted)]">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--pp-accent)]" />Запуски</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#34D399]" />Ваши клиенты</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#6EE7B7] dark:bg-[#10B981]" />Команда</span>
      </div>
    </div>
  );
}

/** The API sends `text_kind` as a short code whose exact set the spec leaves open: match by keyword, with a safe fallback. */
function eventText(e: PartnerEvent): string {
  const k = e.text_kind.toLowerCase();
  const kind = k.includes("launch") ? "launch" : k.includes("pack") ? "pack" : k.includes("subscr") ? "subscription" : null;
  const team = k.includes("team") || k.includes("layer") || Boolean(e.partner_name && !e.client_name);
  if (k.includes("attach") || k.includes("new_client")) return `К вам подключён клиент ${e.client_name ?? ""}`.trim();
  if (kind) {
    const what = PAYMENT_KIND_LABELS[kind].toLowerCase();
    if (team) return `Команда: ${what}${e.partner_name ? `, партнёр ${e.partner_name}` : ""}`;
    return `${PAYMENT_KIND_LABELS[kind]}${e.client_name ? `: ${e.client_name}` : ""}`;
  }
  return e.client_name || e.partner_name ? `Начисление: ${e.client_name || e.partner_name}` : "Начисление";
}

export default function PartnerHome() {
  const { me } = usePartner();
  const { data, error, loading, reload } = useLoad(() => api.partnerOverview());
  const goal = me.profile.goal_kop ?? 0;

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  const empty =
    data.counters.paying_clients === 0 && data.counters.leads === 0 && data.earned_total_kop === 0 && data.events.length === 0;
  const pct = goal > 0 ? Math.min(100, Math.round((data.monthly_income_kop / goal) * 100)) : 0;

  let hint: React.ReactNode;
  if (empty) hint = "Передайте ваш код тем, кому нужна Вера: мы подключим клиента к вам, и он появится здесь.";
  else if (goal <= 0) hint = <>Задайте цель, и мы посчитаем, сколько клиентов вам нужно. <Link href="/partner/goal" className="font-semibold text-[var(--pp-accent)]">Моя цель</Link></>;
  else if (pct < 100) hint = <>До цели осталось {formatRub(goal - data.monthly_income_kop)} в месяц. <Link href="/partner/goal" className="font-semibold text-[var(--pp-accent)]">Посчитать, сколько клиентов нужно</Link></>;
  else hint = "Цель достигнута. Можно поставить следующую.";

  return (
    <div className="space-y-4">
      <RefCodeCard code={me.profile.ref_code} />

      <Card>
        <Label>Ваш доход в месяц</Label>
        <CountUp kop={data.monthly_income_kop} className="block text-4xl sm:text-5xl font-extrabold text-[var(--pp-money)]" />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--pp-muted)]">
          <span>Ваши клиенты: <Money kop={data.monthly_own_kop} /></span>
          {me.is_agency && <span>Команда: <Money kop={data.monthly_team_kop} /></span>}
        </div>
        {goal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[var(--pp-muted)] mb-1">
              <span>Цель {formatRub(goal)}</span>
              <span className="pp-num">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--pp-line)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--pp-accent)] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <Label>{data.next_payout?.due_date ? `К выплате ${formatDayMonth(data.next_payout.due_date)}` : "К выплате"}</Label>
          <CountUp kop={data.next_payout?.amount_kop ?? 0} className="block text-2xl sm:text-3xl font-extrabold text-[var(--pp-money)]" />
          {data.next_payout && data.next_payout.amount_kop > 0 && (
            <div className="mt-2 text-[11px] text-[var(--pp-muted)]">
              Запуски {formatRub(data.next_payout.launches_kop)}, ваши клиенты {formatRub(data.next_payout.own_kop)}, команда {formatRub(data.next_payout.team_kop)}
            </div>
          )}
        </Card>
        <Card>
          <Label>Заработано за всё время</Label>
          <CountUp kop={data.earned_total_kop} className="block text-2xl sm:text-3xl font-extrabold text-[var(--pp-money)]" />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Платящие клиенты", data.counters.paying_clients],
          ["Лиды", data.counters.leads],
          ["Партнёры в команде", data.counters.team_partners],
        ].map(([l, v]) => (
          <Card key={l as string} className="!p-3 text-center">
            <div className="pp-num text-2xl font-extrabold">{v}</div>
            <div className="text-[10px] sm:text-xs text-[var(--pp-muted)] leading-tight mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      {empty ? (
        <Empty title="Пока пусто">
          Здесь появится ваш первый клиент. Передайте ваш код тем, кому нужна Вера, и мы закрепим клиента за вами. Ваш доход, выплаты и график начнут заполняться после его первой оплаты.
        </Empty>
      ) : (
        <>
          <Card>
            <Label>Доход за 12 месяцев</Label>
            <Chart points={data.chart} />
          </Card>
          <Card>
            <Label>Последние события</Label>
            {data.events.length === 0 ? (
              <p className="text-sm text-[var(--pp-muted)]">Событий пока нет.</p>
            ) : (
              <ul className="divide-y divide-[var(--pp-line)]">
                {data.events.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{eventText(e)}</div>
                      <div className="text-[11px] text-[var(--pp-muted)]">{formatDayMonth(e.at)}</div>
                    </div>
                    <Money kop={e.amount_kop} className="font-semibold shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Card className="!bg-[var(--pp-accent-soft)]">
        <Label>Следующий шаг</Label>
        <p className="text-sm">{hint}</p>
      </Card>
    </div>
  );
}

