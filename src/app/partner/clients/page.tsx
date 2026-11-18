"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { api } from "@/lib/api";
import {
  CLIENT_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  PAYMENT_KIND_LABELS,
  formatDate,
  formatPeriod,
  formatRub,
} from "@/lib/partner-format";
import { Card, Chip, Empty, ErrorBox, Label, Money, PageTitle, Spinner, clientStatusTone, useLoad } from "@/components/partner/ui";

function ClientCard({ tenantId }: { tenantId: string }) {
  const { data, error, loading, reload } = useLoad(() => api.partnerClient(tenantId), [tenantId]);
  return (
    <div className="space-y-4">
      <Link href="/partner/clients" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pp-accent)]">
        <ArrowLeft className="h-4 w-4" />
        Все клиенты
      </Link>
      {loading && !data ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorBox text={error || "Клиент не найден"} onRetry={reload} />
      ) : (
        <>
          <PageTitle>{data.business_name}</PageTitle>
          <Card className="grid grid-cols-2 gap-4">
            <div>
              <Label>Статус</Label>
              <Chip tone={clientStatusTone(data.status)}>{CLIENT_STATUS_LABELS[data.status] ?? data.status}</Chip>
            </div>
            <div>
              <Label>Тариф</Label>
              <div className="text-sm">{data.tariff_name ?? "-"}</div>
            </div>
            <div>
              <Label>Ваша роль</Label>
              <div className="text-sm">{DEAL_TYPE_LABELS[data.deal_type] ?? data.deal_type}</div>
            </div>
            <div>
              <Label>Закреплён</Label>
              <div className="text-sm">{formatDate(data.attached_at)}</div>
            </div>
            <div>
              <Label>Вам в месяц</Label>
              <Money kop={data.monthly_to_me_kop} className="text-lg font-bold" />
            </div>
            <div>
              <Label>За всё время</Label>
              <Money kop={data.total_to_me_kop} className="text-lg font-bold" />
            </div>
          </Card>
          <Card>
            <Label>Платежи клиента</Label>
            {data.payments.length === 0 ? (
              <p className="text-sm text-[var(--pp-muted)]">Платежей пока не было. Начисления появятся после первой оплаты клиента.</p>
            ) : (
              <ul className="divide-y divide-[var(--pp-line)]">
                {data.payments.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div>
                        {PAYMENT_KIND_LABELS[p.kind] ?? p.kind}, {formatPeriod(p.period)}
                      </div>
                      <div className="text-[11px] text-[var(--pp-muted)]">
                        Оплата {formatRub(p.amount_kop)}, {formatDate(p.paid_at)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-[var(--pp-muted)]">вам</div>
                      <Money kop={p.my_accrual_kop} className="font-semibold" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function ClientList() {
  const { data, error, loading, reload } = useLoad(() => api.partnerClients());
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (c) => (filter === "all" || c.status === filter) && (!needle || c.business_name.toLowerCase().includes(needle))
    );
  }, [data, filter, q]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  if (data.length === 0) {
    return (
      <>
        <PageTitle>Клиенты</PageTitle>
        <Empty title="Пока пусто">
          Здесь появится ваш первый клиент. Передайте ваш код тем, кому нужна Вера, и мы закрепим клиента за вами.
        </Empty>
      </>
    );
  }

  const statuses = Array.from(new Set(data.map((c) => c.status)));
  const totalMonth = rows.reduce((a, c) => a + c.monthly_to_me_kop, 0);
  const totalAll = rows.reduce((a, c) => a + c.total_to_me_kop, 0);

  return (
    <div className="space-y-4">
      <PageTitle>Клиенты</PageTitle>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--pp-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию"
          className="w-full pl-9 pr-3 py-2.5 text-base"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {["all", ...statuses].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
              filter === s
                ? "bg-[var(--pp-accent)] border-[var(--pp-accent)] text-white"
                : "border-[var(--pp-line)] text-[var(--pp-text)]"
            }`}
          >
            {s === "all" ? "Все" : CLIENT_STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((c) => (
          <Link
            key={c.tenant_id}
            href={`/partner/clients/?id=${encodeURIComponent(c.tenant_id)}`}
            className="block rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-card)] p-4 hover:border-[var(--pp-accent)] transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.business_name}</div>
                <div className="text-[11px] text-[var(--pp-muted)]">
                  {c.tariff_name ?? "Без тарифа"}, {DEAL_TYPE_LABELS[c.deal_type] ?? c.deal_type}
                </div>
              </div>
              <Chip tone={clientStatusTone(c.status)}>{CLIENT_STATUS_LABELS[c.status] ?? c.status}</Chip>
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-[var(--pp-muted)]">
                В месяц <Money kop={c.monthly_to_me_kop} className="font-semibold" />
              </span>
              <span className="text-[var(--pp-muted)]">
                Всего <Money kop={c.total_to_me_kop} className="font-semibold" />
              </span>
            </div>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-[var(--pp-muted)] py-4 text-center">Ничего не найдено.</p>}
      </div>

      <Card className="flex justify-between items-center text-sm !py-3">
        <span className="pp-head text-xs">Итого, {rows.length}</span>
        <span className="text-xs text-[var(--pp-muted)]">
          В месяц <Money kop={totalMonth} className="font-bold" /> · Всего <Money kop={totalAll} className="font-bold" />
        </span>
      </Card>
    </div>
  );
}

function Inner() {
  const id = useSearchParams().get("id");
  return id ? <ClientCard tenantId={id} /> : <ClientList />;
}

export default function PartnerClientsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Inner />
    </Suspense>
  );
}
