"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import {
  PAYMENT_KIND_LABELS,
  PAYOUT_STATUS_LABELS,
  currentPeriod,
  formatBp,
  formatDate,
  formatDayMonth,
  formatPeriod,
  formatRub,
} from "@/lib/partner-format";
import { Card, Chip, CountUp, Empty, ErrorBox, Label, Money, PageTitle, Spinner, useLoad, usePartner } from "@/components/partner/ui";

function Accruals({ period }: { period: string }) {
  const { data, error, loading, reload } = useLoad(() => api.partnerAccruals(period), [period]);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;
  if (data.items.length === 0) return <p className="text-sm text-[var(--pp-muted)] py-3">За этот месяц начислений нет.</p>;
  return (
    <>
      <ul className="divide-y divide-[var(--pp-line)]">
        {data.items.map((a, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="truncate">
                {a.layer === 0 ? a.client_name || "Ваш клиент" : `Партнёр ${a.partner_name ?? ""}`.trim()}
              </div>
              <div className="text-[11px] text-[var(--pp-muted)]">
                {PAYMENT_KIND_LABELS[a.kind] ?? a.kind}, оплата {formatRub(a.base_kop)}, ставка {formatBp(a.rate_bp)}
                {a.settled ? "" : ", ещё не закрыт"}
              </div>
            </div>
            <Money kop={a.amount_kop} className="font-semibold shrink-0" />
          </li>
        ))}
      </ul>
      <div className="flex justify-between pt-3 border-t border-[var(--pp-line)] text-sm">
        <span className="pp-head text-xs">Итого за месяц</span>
        <Money kop={data.total_kop} className="font-bold" />
      </div>
    </>
  );
}

export default function PartnerPayoutsPage() {
  const { me } = usePartner();
  const { data, error, loading, reload } = useLoad(() => api.partnerStatements());
  const [period, setPeriod] = useState<string>(currentPeriod());

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  const nextDue = data.payouts.find((p) => p.status === "due");
  const periods = Array.from(new Set([currentPeriod(), ...data.payouts.map((p) => p.period)])).sort().reverse();

  return (
    <div className="space-y-4">
      <PageTitle hint={`Выплаты раз в месяц, ${me.payout_day}-го числа. Минимальная сумма к выплате: ${formatRub(data.min_payout_kop)}.`}>Выплаты</PageTitle>

      <Card>
        <Label>{nextDue?.due_date ? `К выплате ${formatDayMonth(nextDue.due_date)}` : "Накоплено, ещё не закрыто"}</Label>
        <CountUp kop={nextDue ? nextDue.amount_kop : data.unsettled_kop} className="block text-3xl font-extrabold text-[var(--pp-money)]" />
        <p className="mt-2 text-xs text-[var(--pp-muted)]">
          {data.unsettled_kop > 0
            ? `Ещё не вошло в закрытый месяц: ${formatRub(data.unsettled_kop)}. Если сумма меньше минимальной, она переходит на следующий месяц.`
            : "Всё начисленное уже вошло в выплаты."}
        </p>
      </Card>

      <Card>
        <Label>История выплат</Label>
        {data.payouts.length === 0 ? (
          <Empty>Здесь появятся ваши выплаты после закрытия первого месяца с начислениями.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--pp-line)]">
            {data.payouts.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{formatPeriod(p.period)}</div>
                    <div className="mt-1">
                      <Chip tone={p.status === "paid" ? "good" : p.status === "due" ? "info" : "mute"}>
                        {PAYOUT_STATUS_LABELS[p.status] ?? p.status}
                      </Chip>
                    </div>
                  </div>
                  <div className="text-right">
                    <Money kop={p.amount_kop} className="font-bold text-lg" />
                    <div className="text-[11px] text-[var(--pp-muted)]">
                      {p.status === "paid" ? `выплачено ${formatDate(p.paid_at)}` : p.due_date ? `срок ${formatDayMonth(p.due_date)}` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--pp-muted)]">
                  Запуски {formatRub(p.launches_kop)}, ваши клиенты {formatRub(p.own_kop)}, команда {formatRub(p.team_kop)}
                  {p.carried_in_kop > 0 ? `, перенесено с прошлых месяцев ${formatRub(p.carried_in_kop)}` : ""}
                </div>
                {p.status === "carried" && (
                  <div className="mt-1 text-[11px] text-[var(--pp-muted)]">Сумма меньше минимальной и перейдёт на следующий месяц.</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-2">
          <Label>Начисления по месяцам</Label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 text-base">
            {periods.map((p) => (
              <option key={p} value={p}>
                {formatPeriod(p)}
              </option>
            ))}
          </select>
        </div>
        <Accruals period={period} />
      </Card>
    </div>
  );
}
