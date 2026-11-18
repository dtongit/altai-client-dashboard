"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DEAL_TYPE_HINTS, DEAL_TYPE_LABELS, LEGAL_STATUS_LABELS } from "@/lib/partner-format";
import { PartnerDealType, PartnerLegalStatus } from "@/types";
import { Card, Chip, ErrorBox, Label, PageTitle, btnGhost, btnPrimary, inputCls, usePartner } from "@/components/partner/ui";

export default function PartnerProfilePage() {
  const { me, setMe } = usePartner();
  const { logout } = useAuth();
  const p = me.profile;
  const [name, setName] = useState(p.display_name ?? "");
  const [contact, setContact] = useState(p.contact ?? "");
  const [legal, setLegal] = useState<PartnerLegalStatus | "">(p.legal_status ?? "");
  const [inn, setInn] = useState(p.inn ?? "");
  const [details, setDetails] = useState(p.payout_details ?? "");
  const [deal, setDeal] = useState<PartnerDealType>(p.default_deal_type ?? "rep");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [codeSaving, setCodeSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      setMe(
        await api.partnerUpdateMe({
          display_name: name.trim(),
          contact: contact.trim(),
          legal_status: legal || null,
          inn: inn.trim(),
          payout_details: details.trim(),
          default_deal_type: deal,
        })
      );
      setMsg("Сохранено");
    } catch (e2) {
      setErr((e2 as { detail?: string })?.detail || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const changeCode = async () => {
    const c = code.trim().toLowerCase();
    if (!/^[a-z0-9]{4,20}$/.test(c)) {
      setCodeErr("От 4 до 20 символов: латинские буквы и цифры");
      return;
    }
    if (!window.confirm(`Сменить код на «${c}»? Это можно сделать только один раз.`)) return;
    setCodeSaving(true);
    setCodeErr(null);
    try {
      setMe(await api.partnerUpdateMe({ ref_code: c }));
      setCode("");
    } catch (e) {
      const x = e as { status?: number; detail?: string };
      setCodeErr(x.status === 409 ? "Такой код уже занят, выберите другой" : x.detail || "Не удалось сменить код");
    } finally {
      setCodeSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>Профиль</PageTitle>

      <Card className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label>Логин</Label>
          <div className="text-sm truncate">{me.username}</div>
        </div>
        {me.is_agency && <Chip tone="info">Кадровое агентство</Chip>}
      </Card>

      <form onSubmit={save}>
        <Card className="space-y-4">
          <label className="block">
            <Label>Имя в программе</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <Label>Контакт для связи</Label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Телеграм или телефон" className={inputCls} />
          </label>
          <label className="block">
            <Label>Ваша роль по умолчанию</Label>
            <select value={deal} onChange={(e) => setDeal(e.target.value as PartnerDealType)} className={inputCls}>
              {(["rep", "manager"] as const).map((d) => (
                <option key={d} value={d}>
                  {DEAL_TYPE_LABELS[d]}: {DEAL_TYPE_HINTS[d]}
                </option>
              ))}
            </select>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <Label>Статус для выплат</Label>
              <select value={legal} onChange={(e) => setLegal(e.target.value as PartnerLegalStatus | "")} className={inputCls}>
                <option value="">Не указан</option>
                {Object.entries(LEGAL_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Label>ИНН</Label>
              <input inputMode="numeric" value={inn} onChange={(e) => setInn(e.target.value)} className={`${inputCls} pp-num`} />
            </label>
          </div>
          <label className="block">
            <Label>Реквизиты для выплат</Label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Банк, счёт или номер карты, БИК" className={inputCls} />
          </label>
          <p className="text-[11px] text-[var(--pp-muted)]">Без статуса и ИНН выплаты начисляются, но перевести их мы сможем только после того, как вы их заполните.</p>
          {err && <ErrorBox text={err} />}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            {msg && <span className="text-sm text-[var(--pp-money)]">{msg}</span>}
          </div>
        </Card>
      </form>

      <Card>
        <Label>Ваш код</Label>
        <div className="pp-num text-xl font-bold tracking-wider">{p.ref_code}</div>
        {p.ref_code_changed ? (
          <p className="mt-2 text-xs text-[var(--pp-muted)]">Код уже менялся, повторно сменить его нельзя.</p>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[var(--pp-muted)]">Один раз можно выбрать свой код: 4-20 символов, латинские буквы и цифры.</p>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Новый код" maxLength={20} className={`${inputCls} pp-num`} />
              <button type="button" onClick={changeCode} disabled={codeSaving || !code.trim()} className={`${btnGhost} shrink-0`}>
                Сменить
              </button>
            </div>
            {codeErr && <p className="text-xs text-red-500">{codeErr}</p>}
          </div>
        )}
      </Card>

      <button type="button" onClick={logout} className={`${btnGhost} w-full sm:w-auto`}>
        Выйти из кабинета
      </button>
    </div>
  );
}
