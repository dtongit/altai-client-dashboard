"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Link2, Pencil, Lock, Unlock } from "lucide-react";
import { api } from "@/lib/api";
import { AdminPartner, AdminPayout, BillingClient, PartnerDealType, PartnerLegalStatus } from "@/types";
import {
  DEAL_TYPE_LABELS,
  LEGAL_STATUS_LABELS,
  PARTNER_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  currentPeriod,
  formatDate,
  formatPeriod,
  formatRub,
} from "@/lib/partner-format";
import {
  AdminFrame,
  F,
  Modal,
  Pill,
  TableWrap,
  Tabs,
  aBtn,
  aBtnGhost,
  aInput,
  aTd,
  aTh,
  useToastLocal,
} from "@/components/admin-money-ui";

type Tab = "partners" | "payouts";

function prevPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CreateModal({ onClose, onDone, toast }: { onClose: () => void; onDone: () => void; toast: ReturnType<typeof useToastLocal> }) {
  const [f, setF] = useState({ username: "", email: "", password: "", display_name: "", inviter_ref_code: "", default_deal_type: "rep" as PartnerDealType, contact: "" });
  // "new": a separate partner account; "existing": a partner profile for an account that already exists (it keeps
  // its companies and password).
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const extra = {
        display_name: f.display_name.trim(),
        default_deal_type: f.default_deal_type,
        ...(f.inviter_ref_code.trim() ? { inviter_ref_code: f.inviter_ref_code.trim().toLowerCase() } : {}),
        ...(f.contact.trim() ? { contact: f.contact.trim() } : {}),
      };
      if (mode === "existing") {
        await api.adminEnableExistingPartner({ login: f.username.trim(), ...extra });
        toast.show("success", "Аккаунт подключён к программе");
      } else {
        await api.adminCreatePartner({ username: f.username.trim(), email: f.email.trim(), password: f.password, ...extra });
        toast.show("success", "Партнёр создан");
      }
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Новый партнёр" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2 text-sm">
          {([["new", "Новый аккаунт"], ["existing", "Существующий аккаунт"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-1.5 ${mode === m ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "existing" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Аккаунт сохранит свои компании, права и пароль; кабинет партнёра откроется под тем же логином.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {mode === "existing" ? (
            <F label="Логин или email"><input required className={aInput} value={f.username} onChange={(e) => set("username", e.target.value)} /></F>
          ) : (
            <>
              <F label="Логин"><input required className={aInput} value={f.username} onChange={(e) => set("username", e.target.value)} /></F>
              <F label="Email"><input required type="email" className={aInput} value={f.email} onChange={(e) => set("email", e.target.value)} /></F>
              <F label="Пароль"><input required type="text" autoComplete="off" className={aInput} value={f.password} onChange={(e) => set("password", e.target.value)} /></F>
            </>
          )}
          <F label="Имя в программе"><input required className={aInput} value={f.display_name} onChange={(e) => set("display_name", e.target.value)} /></F>
          <F label="Код пригласившего" hint="Пусто: партнёр без пригласившего"><input className={aInput} value={f.inviter_ref_code} onChange={(e) => set("inviter_ref_code", e.target.value)} /></F>
          <F label="Роль по умолчанию">
            <select className={aInput} value={f.default_deal_type} onChange={(e) => set("default_deal_type", e.target.value)}>
              <option value="rep">{DEAL_TYPE_LABELS.rep}</option>
              <option value="manager">{DEAL_TYPE_LABELS.manager}</option>
            </select>
          </F>
        </div>
        <F label="Контакт"><input className={aInput} value={f.contact} onChange={(e) => set("contact", e.target.value)} /></F>
        <button type="submit" disabled={busy} className={aBtn}>{busy ? "Сохраняем..." : mode === "existing" ? "Подключить" : "Создать"}</button>
      </form>
    </Modal>
  );
}

function EditModal({ p, onClose, onDone, toast }: { p: AdminPartner; onClose: () => void; onDone: () => void; toast: ReturnType<typeof useToastLocal> }) {
  const [name, setName] = useState(p.display_name ?? "");
  const [inviter, setInviter] = useState(p.inviter_ref_code ?? "");
  const [deal, setDeal] = useState<PartnerDealType>(p.default_deal_type ?? "rep");
  const [contact, setContact] = useState(p.contact ?? "");
  const [legal, setLegal] = useState<PartnerLegalStatus | "">(p.legal_status ?? "");
  const [inn, setInn] = useState(p.inn ?? "");
  const [details, setDetails] = useState(p.payout_details ?? "");
  const [busy, setBusy] = useState(false);

  const run = async (patch: Parameters<typeof api.adminUpdatePartner>[1], msg: string) => {
    setBusy(true);
    try {
      await api.adminUpdatePartner(p.user_id, patch);
      toast.show("success", msg);
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Parameters<typeof api.adminUpdatePartner>[1] = {
      display_name: name.trim(),
      default_deal_type: deal,
      contact: contact.trim(),
      legal_status: legal || null,
      inn: inn.trim(),
      payout_details: details.trim(),
    };
    // Send the inviter only when it changed (the change is audited); empty = detach.
    if (inviter.trim().toLowerCase() !== (p.inviter_ref_code ?? "")) patch.inviter_ref_code = inviter.trim() ? inviter.trim().toLowerCase() : null;
    void run(patch, "Сохранено");
  };
  const blocked = p.status === "blocked";
  return (
    <Modal title={`Партнёр: ${p.display_name || p.username}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="text-[11px] text-zinc-500">
          {p.username}, {p.email}, код <b>{p.ref_code}</b>, пригласил: {p.inviter_name || "никто"}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="Имя в программе"><input className={aInput} value={name} onChange={(e) => setName(e.target.value)} /></F>
          <F label="Код пригласившего" hint="Смена попадает в журнал. Пусто: открепить"><input className={aInput} value={inviter} onChange={(e) => setInviter(e.target.value)} /></F>
          <F label="Роль по умолчанию">
            <select className={aInput} value={deal} onChange={(e) => setDeal(e.target.value as PartnerDealType)}>
              <option value="rep">{DEAL_TYPE_LABELS.rep}</option>
              <option value="manager">{DEAL_TYPE_LABELS.manager}</option>
            </select>
          </F>
          <F label="Контакт"><input className={aInput} value={contact} onChange={(e) => setContact(e.target.value)} /></F>
          <F label="Статус для выплат">
            <select className={aInput} value={legal} onChange={(e) => setLegal(e.target.value as PartnerLegalStatus | "")}>
              <option value="">Не указан</option>
              {Object.entries(LEGAL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
          <F label="ИНН"><input className={aInput} value={inn} onChange={(e) => setInn(e.target.value)} /></F>
        </div>
        <F label="Реквизиты для выплат"><textarea rows={3} className={aInput} value={details} onChange={(e) => setDetails(e.target.value)} /></F>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={aBtn}>Сохранить</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run({ status: blocked ? "approved" : "blocked" }, blocked ? "Разблокирован" : "Заблокирован")}
            className={aBtnGhost}
          >
            {blocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {blocked ? "Разблокировать" : "Заблокировать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AttachModal({ partner, clients, onClose, onDone, toast }: { partner: AdminPartner | null; clients: BillingClient[]; onClose: () => void; onDone: () => void; toast: ReturnType<typeof useToastLocal> }) {
  const [tenant, setTenant] = useState("");
  const [ref, setRef] = useState(partner?.ref_code ?? "");
  const [deal, setDeal] = useState<PartnerDealType>(partner?.default_deal_type ?? "rep");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminAttachPartnerClient({ tenant_id: tenant, ref_code: ref.trim().toLowerCase(), deal_type: deal });
      toast.show("success", "Клиент закреплён");
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Закрепить клиента за партнёром" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <F label="Клиент">
          <select required className={aInput} value={tenant} onChange={(e) => setTenant(e.target.value)}>
            <option value="">Выберите...</option>
            {clients.map((c) => (
              <option key={c.tenant_id} value={c.tenant_id}>
                {c.business_name} ({c.tenant_id}){c.partner ? `, сейчас: ${c.partner.name ?? c.partner.ref_code}` : ""}
              </option>
            ))}
          </select>
        </F>
        <F label="Код партнёра"><input required className={aInput} value={ref} onChange={(e) => setRef(e.target.value)} /></F>
        <F label="Роль в сделке" hint="Влияет только на следующие оплаты клиента">
          <select className={aInput} value={deal} onChange={(e) => setDeal(e.target.value as PartnerDealType)}>
            <option value="rep">{DEAL_TYPE_LABELS.rep}: пул 20% запуск, 10% в месяц</option>
            <option value="manager">{DEAL_TYPE_LABELS.manager}: пул 30% запуск, 20% в месяц</option>
          </select>
        </F>
        <button type="submit" disabled={busy || !tenant} className={aBtn}>{busy ? "Закрепляем..." : "Закрепить"}</button>
      </form>
    </Modal>
  );
}

export default function AdminPartnersPage() {
  const toast = useToastLocal();
  const [tab, setTab] = useState<Tab>("partners");
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { kind: "create" } | { kind: "edit"; p: AdminPartner } | { kind: "attach"; p: AdminPartner | null }>(null);
  const [closePeriod, setClosePeriod] = useState(prevPeriod());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, po, cl] = await Promise.all([
        api.adminListPartners(status || undefined),
        api.adminListPayouts(),
        api.adminListBillingClients().catch(() => [] as BillingClient[]),
      ]);
      setPartners(p);
      setPayouts(po);
      setClients(cl);
    } catch (e) {
      toast.fail(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const names = useMemo(() => new Map(partners.map((p) => [p.user_id, p.display_name || p.username])), [partners]);
  const noDetails = useMemo(() => new Map(partners.map((p) => [p.user_id, !p.has_details])), [partners]);
  const done = () => {
    setModal(null);
    void load();
  };

  const closeIt = async () => {
    if (!window.confirm(`Закрыть период ${closePeriod}? Это можно сделать один раз.`)) return;
    setBusy(true);
    try {
      await api.adminClosePeriod(closePeriod);
      toast.show("success", `Период ${closePeriod} закрыт`);
      void load();
    } catch (e) {
      toast.fail(e);
    } finally {
      setBusy(false);
    }
  };
  const markPaid = async (id: string) => {
    if (!window.confirm("Отметить выплату как выплаченную?")) return;
    try {
      await api.adminMarkPayoutPaid(id);
      toast.show("success", "Отмечено как выплачено");
      void load();
    } catch (e) {
      toast.fail(e);
    }
  };

  return (
    <AdminFrame title="Партнёры" subtitle="Программа «Устрой Веру на работу»: партнёры, привязка клиентов, закрытие периода и выплаты" toast={toast.toast}>
      <Tabs tabs={[["partners", "Партнёры"], ["payouts", "Выплаты"]]} value={tab} onChange={setTab} />

      {tab === "partners" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${aInput} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Все статусы</option>
              {Object.entries(PARTNER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className={aBtn} onClick={() => setModal({ kind: "create" })}><Plus className="h-3.5 w-3.5" />Новый партнёр</button>
            <button className={aBtnGhost} onClick={() => setModal({ kind: "attach", p: null })}><Link2 className="h-3.5 w-3.5" />Закрепить клиента</button>
          </div>
          <TableWrap>
            <thead>
              <tr>
                {["Партнёр", "Код", "Статус", "Пригласил", "Клиентов", "Платящих", "К выплате", "Реквизиты", ""].map((h) => <th key={h} className={aTh}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {partners.map((p) => (
                <tr key={p.user_id}>
                  <td className={aTd}>
                    <div className="font-semibold">{p.display_name || p.username}</div>
                    <div className="text-[10px] text-zinc-500">{p.username}, {p.email}</div>
                  </td>
                  <td className={`${aTd} font-mono`}>{p.ref_code}</td>
                  <td className={aTd}><Pill tone={p.status === "approved" ? "good" : p.status === "blocked" ? "bad" : "warn"}>{PARTNER_STATUS_LABELS[p.status] ?? p.status}</Pill></td>
                  <td className={aTd}>{p.inviter_name || "-"}</td>
                  <td className={aTd}>{p.clients}</td>
                  <td className={aTd}>{p.paying_clients}</td>
                  <td className={aTd}>{formatRub(p.unsettled_kop)}</td>
                  <td className={aTd}>{p.has_details ? <Pill tone="good">Есть</Pill> : <Pill tone="warn">Нет реквизитов</Pill>}</td>
                  <td className={`${aTd} whitespace-nowrap`}>
                    <button className={aBtnGhost} onClick={() => setModal({ kind: "edit", p })}><Pencil className="h-3 w-3" />Изменить</button>{" "}
                    <button className={aBtnGhost} onClick={() => setModal({ kind: "attach", p })}><Link2 className="h-3 w-3" />Клиент</button>
                  </td>
                </tr>
              ))}
              {!loading && partners.length === 0 && <tr><td colSpan={9} className={`${aTd} text-center text-zinc-500 py-6`}>Партнёров нет</td></tr>}
            </tbody>
          </TableWrap>
        </div>
      )}

      {tab === "payouts" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3">
            <F label="Закрыть период (ГГГГ-ММ)"><input className={`${aInput} !w-36`} value={closePeriod} onChange={(e) => setClosePeriod(e.target.value)} placeholder={currentPeriod()} /></F>
            <button className={aBtn} disabled={busy || !/^\d{4}-\d{2}$/.test(closePeriod)} onClick={closeIt}>Закрыть период</button>
            <span className="text-[11px] text-zinc-500">Суммы выше минимума станут выплатами «К выплате», остальные переносятся.</span>
          </div>
          <TableWrap>
            <thead>
              <tr>{["Партнёр", "Период", "Сумма", "Перенесено", "Статус", "Срок", "Выплачено", ""].map((h) => <th key={h} className={aTh}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className={aTd}>
                    {p.partner_name || names.get(p.partner_user_id) || p.partner_user_id}
                    {(p.has_details === false || noDetails.get(p.partner_user_id)) && <span className="ml-2"><Pill tone="warn">нет реквизитов</Pill></span>}
                  </td>
                  <td className={aTd}>{formatPeriod(p.period)}</td>
                  <td className={`${aTd} font-semibold`}>{formatRub(p.amount_kop)}</td>
                  <td className={aTd}>{p.carried_in_kop ? formatRub(p.carried_in_kop) : "-"}</td>
                  <td className={aTd}><Pill tone={p.status === "paid" ? "good" : p.status === "due" ? "info" : "mute"}>{PAYOUT_STATUS_LABELS[p.status] ?? p.status}</Pill></td>
                  <td className={aTd}>{p.due_date ? formatDate(p.due_date) : "-"}</td>
                  <td className={aTd}>{p.paid_at ? formatDate(p.paid_at) : "-"}</td>
                  <td className={aTd}>{p.status === "due" && <button className={aBtn} onClick={() => markPaid(p.id)}>Выплачено</button>}</td>
                </tr>
              ))}
              {!loading && payouts.length === 0 && <tr><td colSpan={8} className={`${aTd} text-center text-zinc-500 py-6`}>Выплат нет</td></tr>}
            </tbody>
          </TableWrap>
        </div>
      )}

      {modal?.kind === "create" && <CreateModal onClose={() => setModal(null)} onDone={done} toast={toast} />}
      {modal?.kind === "edit" && <EditModal p={modal.p} onClose={() => setModal(null)} onDone={done} toast={toast} />}
      {modal?.kind === "attach" && <AttachModal partner={modal.p} clients={clients} onClose={() => setModal(null)} onDone={done} toast={toast} />}
    </AdminFrame>
  );
}
