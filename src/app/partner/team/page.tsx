"use client";

import React from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/partner-format";
import { Card, CountUp, Empty, ErrorBox, Label, Money, PageTitle, Spinner, useLoad } from "@/components/partner/ui";

export default function PartnerTeamPage() {
  const { data, error, loading, reload } = useLoad(() => api.partnerTeam());
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageTitle hint="Партнёры, которых пригласили вы, и их партнёры. Имена клиентов вам не показываются.">Команда</PageTitle>
      {data.layer1.length === 0 ? (
        <Empty title="Пока пусто">
          Здесь появятся партнёры, которых пригласили вы. Новых партнёров подключаем мы: напишите нам, если хотите собрать команду.
        </Empty>
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-4">
            <div>
              <Label>Вам в месяц от команды</Label>
              <CountUp kop={data.monthly_team_kop} className="block text-2xl font-extrabold text-[var(--pp-money)]" />
            </div>
            <div>
              <Label>Партнёров в команде</Label>
              <div className="pp-num text-2xl font-extrabold">{data.partners_total}</div>
            </div>
          </Card>
          <div className="space-y-2">
            {data.layer1.map((p, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-[var(--pp-muted)]">В команде с {formatDate(p.joined_at)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-[var(--pp-muted)]">вам в месяц</div>
                    <Money kop={p.monthly_to_me_kop} className="font-bold" />
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-xs text-[var(--pp-muted)]">
                  <span>
                    Платящих клиентов: <span className="pp-num text-[var(--pp-text)]">{p.paying_clients}</span>
                  </span>
                  <span>
                    За всё время <Money kop={p.total_to_me_kop} className="font-semibold" />
                  </span>
                </div>
                {p.layer2.partners > 0 && (
                  <div className="mt-3 rounded-xl bg-[var(--pp-accent-soft)] px-3 py-2 text-xs">
                    Партнёров у них: {p.layer2.partners}, платящих клиентов: {p.layer2.paying_clients}, вам в месяц{" "}
                    <Money kop={p.layer2.monthly_to_me_kop} className="font-semibold" />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
