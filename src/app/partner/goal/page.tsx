"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { calcGoal } from "@/lib/partner-calc";
import { DEAL_TYPE_LABELS, formatBp, formatRub } from "@/lib/partner-format";
import { PartnerDealType } from "@/types";
import { Card, ErrorBox, Label, Money, PageTitle, Spinner, btnPrimary, inputCls, useLoad, usePartner } from "@/components/partner/ui";

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pp-num ${suffix ? "pr-9" : ""}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--pp-muted)]">{suffix}</span>}
      </div>
    </label>
  );
}

export default function PartnerGoalPage() {
  const { me, setMe } = usePartner();
  const { data, error, loading, reload } = useLoad(() => api.partnerForecast());

  const [tariffCode, setTariffCode] = useState("");
  // The calculator starts from how the partner worked last month (a head-hunter if any client of theirs was).
  const startDeal: PartnerDealType = me.roles?.includes("headhunter") ? "manager" : "rep";
  const [dealType, setDealType] = useState<PartnerDealType>(startDeal);
  const [goal, setGoal] = useState("");
  const [perMonth, setPerMonth] = useState("2");
  const [l1, setL1] = useState("0");
  const [l2, setL2] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setTariffCode((c) => c || data.tariffs[0]?.code || "");
    setGoal(String(Math.round((data.goal_kop ?? 0) / 100) || 100000));
    setL1(String(data.team.layer1_clients));
    setL2(String(data.team.layer2_clients));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox text={error || "Нет данных"} onRetry={reload} />;

  const tariff = data.tariffs.find((t) => t.code === tariffCode) ?? data.tariffs[0];
  const goalKop = Math.round(num(goal) * 100);
  const r = calcGoal({
    splitRates: data.split_rates,
    dealType,
    depth: data.depth,
    hasInviter: me.profile.has_inviter,
    monthlyPriceKop: tariff?.monthly_kop ?? 0,
    goalKop,
    layer1Clients: Math.floor(num(l1)),
    layer2Clients: Math.floor(num(l2)),
    payingClients: data.paying_clients,
    newPerMonth: Math.floor(num(perMonth)),
  });

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      setMe(await api.partnerUpdateMe({ goal_kop: goalKop }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError((e as { detail?: string })?.detail || "Не удалось сохранить цель");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentGoal = (me.profile.goal_kop ?? 0) === goalKop && goalKop > 0;

  return (
    <div className="space-y-4">
      <PageTitle hint="Сколько клиентов вам нужно, чтобы выйти на желаемый доход в месяц. Расчёт идёт по ежемесячным ставкам.">Моя цель</PageTitle>

      <Card className="grid sm:grid-cols-2 gap-4">
        <Field label="Желаемый доход в месяц" value={goal} onChange={setGoal} suffix="₽" />
        <label className="block">
          <Label>Тариф клиента</Label>
          <select value={tariff?.code ?? ""} onChange={(e) => setTariffCode(e.target.value)} className={inputCls}>
            {data.tariffs.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}, {formatRub(t.monthly_kop)} в месяц
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Как вы работаете</Label>
          <select value={dealType} onChange={(e) => setDealType(e.target.value as PartnerDealType)} className={inputCls}>
            {(["rep", "manager"] as const).map((d) => (
              <option key={d} value={d}>
                {DEAL_TYPE_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <Field label="Новых клиентов в месяц" value={perMonth} onChange={setPerMonth} />
        {me.is_agency && (
          <>
            <Field label="Клиентов у ваших партнёров" value={l1} onChange={setL1} />
            <Field label="Клиентов у партнёров ваших партнёров" value={l2} onChange={setL2} />
          </>
        )}
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>С одного клиента в месяц</Label>
            <Money kop={r.perClientKop} className="text-xl font-extrabold" />
            <div className="text-[11px] text-[var(--pp-muted)]">ваша доля {formatBp(r.sellerBp)}</div>
          </div>
          {me.is_agency && (
            <div>
              <Label>От команды в месяц</Label>
              <Money kop={r.teamKop} className="text-xl font-extrabold" />
            </div>
          )}
          <div>
            <Label>Нужно клиентов</Label>
            <div className="pp-num text-3xl font-extrabold">{r.neededClients}</div>
          </div>
          <div>
            <Label>Осталось привести</Label>
            <div className="pp-num text-3xl font-extrabold">{r.remainingClients}</div>
            <div className="text-[11px] text-[var(--pp-muted)]">платящих сейчас: {data.paying_clients}</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[var(--pp-accent-soft)] px-3 py-2.5 text-sm">
          {r.perClientKop <= 0
            ? "Для выбранных параметров доля не задана. Выберите другой тариф или роль."
            : r.remainingClients === 0
            ? "Нужное число клиентов у вас уже есть."
            : r.months === null
            ? "Укажите, сколько новых клиентов в месяц вы планируете."
            : `При ${Math.floor(num(perMonth))} новых клиентах в месяц вы выйдете на цель за ${r.months} мес.`}
        </div>
      </Card>

      {saveError && <ErrorBox text={saveError} />}
      <button type="button" onClick={save} disabled={saving || goalKop <= 0 || isCurrentGoal} className={`${btnPrimary} w-full sm:w-auto`}>
        {saved || isCurrentGoal ? "Это ваша цель" : saving ? "Сохраняем..." : "Сделать моей целью"}
      </button>
    </div>
  );
}
