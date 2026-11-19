"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/api";
import {
  AdminPayment,
  BillingClient,
  BillingClientStatus,
  BillingSettings,
  ClientInvoice,
  InvoiceStatus,
  PartnerDealType,
  PaymentKind,
  SellerRequisites,
  SplitRates,
  Tariff,
} from "@/types";
import {
  CLIENT_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_KIND_LABELS,
  currentPeriod,
  formatDate,
  formatPeriod,
  formatRub,
} from "@/lib/partner-format";
import {
  AdminFrame,
  F,
  Modal,
  PctInput,
  Pill,
  RubInput,
  TableWrap,
  Tabs,
  aBtn,
  aBtnDanger,
  aBtnGhost,
  aInput,
  aTd,
  aTh,
  useToastLocal,
} from "@/components/admin-money-ui";

type Tab = "clients" | "invoices" | "payments" | "tariffs" | "settings";
type T = ReturnType<typeof useToastLocal>;

const KINDS: PaymentKind[] = ["launch", "subscription", "pack"];

// ---------------------------------------------------------------- clients
function ClientModal({ c, tariffs, onClose, onDone, toast }: { c: BillingClient; tariffs: Tariff[]; onClose: () => void; onDone: () => void; toast: T }) {
  const [tariff, setTariff] = useState(c.tariff_id ?? "");
  const [status, setStatus] = useState<BillingClientStatus>(c.status ?? "lead");
  const [legal, setLegal] = useState(c.legal_name ?? "");
  const [inn, setInn] = useState(c.inn ?? "");
  const [address, setAddress] = useState(c.address ?? "");
  const [email, setEmail] = useState(c.email ?? "");
  const [notes, setNotes] = useState(c.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState(c.partner?.ref_code ?? "");
  const [deal, setDeal] = useState<PartnerDealType>(c.partner?.deal_type ?? "rep");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminPutBillingClient(c.tenant_id, {
        ...(tariff ? { tariff_id: tariff } : {}),
        status,
        legal_name: legal.trim(),
        inn: inn.trim(),
        address: address.trim(),
        email: email.trim(),
        notes: notes.trim(),
      });
      toast.show("success", "Сохранено");
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  const attach = async () => {
    setBusy(true);
    try {
      await api.adminAttachPartnerClient({ tenant_id: c.tenant_id, ref_code: ref.trim().toLowerCase(), deal_type: deal });
      toast.show("success", "Партнёр закреплён");
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Клиент: ${c.business_name}`} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <F label="Тариф">
            <select className={aInput} value={tariff} onChange={(e) => setTariff(e.target.value)}>
              <option value="">Не выбран</option>
              {tariffs.map((t) => <option key={t.id} value={t.id}>{t.name}, {formatRub(t.monthly_kop)}</option>)}
            </select>
          </F>
          <F label="Статус">
            <select className={aInput} value={status} onChange={(e) => setStatus(e.target.value as BillingClientStatus)}>
              {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
          <F label="Юрлицо покупателя"><input className={aInput} value={legal} onChange={(e) => setLegal(e.target.value)} /></F>
          <F label="ИНН"><input className={aInput} value={inn} onChange={(e) => setInn(e.target.value)} /></F>
          <F label="Адрес"><input className={aInput} value={address} onChange={(e) => setAddress(e.target.value)} /></F>
          <F label="Email для счетов"><input className={aInput} value={email} onChange={(e) => setEmail(e.target.value)} /></F>
        </div>
        <F label="Заметки"><textarea rows={2} className={aInput} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>
        <button type="submit" disabled={busy} className={aBtn}>Сохранить</button>
      </form>
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-2">
        <div className="text-[11px] font-bold uppercase text-zinc-500">
          Партнёр: {c.partner ? `${c.partner.name ?? "-"} (${c.partner.ref_code}), ${DEAL_TYPE_LABELS[c.partner.deal_type]}` : "не закреплён"}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <F label="Код партнёра"><input className={`${aInput} !w-40`} value={ref} onChange={(e) => setRef(e.target.value)} /></F>
          <F label="Роль">
            <select className={`${aInput} !w-auto`} value={deal} onChange={(e) => setDeal(e.target.value as PartnerDealType)}>
              <option value="rep">{DEAL_TYPE_LABELS.rep}</option>
              <option value="manager">{DEAL_TYPE_LABELS.manager}</option>
            </select>
          </F>
          <button type="button" disabled={busy || !ref.trim()} onClick={attach} className={aBtnGhost}>Закрепить</button>
        </div>
        <p className="text-[10px] text-zinc-500">Смена партнёра или роли влияет только на следующие оплаты.</p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- invoices
function IssueModal({ clients, tariffs, preset, onClose, onDone, toast }: { clients: BillingClient[]; tariffs: Tariff[]; preset?: string; onClose: () => void; onDone: () => void; toast: T }) {
  const [tenant, setTenant] = useState(preset ?? "");
  const [kind, setKind] = useState<PaymentKind>("launch");
  const [period, setPeriod] = useState(currentPeriod());
  const [amountText, setAmountText] = useState("");
  const [packs, setPacks] = useState("1");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const tariff = tariffs.find((t) => t.id === clients.find((c) => c.tenant_id === tenant)?.tariff_id);
  const defaultKop = tariff ? (kind === "launch" ? tariff.launch_kop : kind === "subscription" ? tariff.monthly_kop : tariff.pack_kop * Math.max(1, Number(packs) || 1)) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.adminCreateInvoice({
        tenant_id: tenant,
        kind,
        period,
        ...(amountText.trim() ? { amount_kop: Math.round(Number(amountText.replace(",", ".")) * 100) } : {}),
        ...(kind === "pack" ? { packs: Math.max(1, Number(packs) || 1) } : {}),
        ...(desc.trim() ? { description: desc.trim() } : {}),
      });
      toast.show("success", "Счёт выставлен");
      onDone();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Выставить счёт" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <F label="Клиент">
          <select required className={aInput} value={tenant} onChange={(e) => setTenant(e.target.value)}>
            <option value="">Выберите...</option>
            {clients.map((c) => <option key={c.tenant_id} value={c.tenant_id}>{c.business_name}</option>)}
          </select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Вид">
            <select className={aInput} value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
              {KINDS.map((k) => <option key={k} value={k}>{PAYMENT_KIND_LABELS[k]}</option>)}
            </select>
          </F>
          <F label="Период (ГГГГ-ММ)"><input required pattern="\d{4}-\d{2}" className={aInput} value={period} onChange={(e) => setPeriod(e.target.value)} /></F>
        </div>
        {kind === "pack" && <F label="Количество пакетов"><input inputMode="numeric" className={aInput} value={packs} onChange={(e) => setPacks(e.target.value)} /></F>}
        <F label="Сумма, ₽" hint={defaultKop !== null ? `Пусто: по тарифу, ${formatRub(defaultKop)}` : "Пусто: по тарифу клиента (тариф не выбран)"}>
          <input inputMode="decimal" className={aInput} placeholder="по тарифу" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
        </F>
        <F label="Строка в счёте"><input className={aInput} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Необязательно" /></F>
        <button type="submit" disabled={busy || !tenant || (amountText.trim() !== "" && !(Number(amountText.replace(",", ".")) > 0))} className={aBtn}>{busy ? "Выставляем..." : "Выставить"}</button>
      </form>
    </Modal>
  );
}

function InvoicesTab({ clients, tariffs, toast, issueFor, clearIssue }: { clients: BillingClient[]; tariffs: Tariff[]; toast: T; issueFor: string | null; clearIssue: () => void }) {
  const [rows, setRows] = useState<ClientInvoice[]>([]);
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [tenant, setTenant] = useState("");
  const [issue, setIssue] = useState(false);
  const names = useMemo(() => new Map(clients.map((c) => [c.tenant_id, c.business_name])), [clients]);
  const load = useCallback(async () => {
    try {
      setRows(await api.adminListInvoices({ status, tenant_id: tenant }));
    } catch (e) {
      toast.fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tenant]);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try { await fn(); toast.show("success", ok); void load(); } catch (e) { toast.fail(e); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className={`${aInput} !w-auto`} value={tenant} onChange={(e) => setTenant(e.target.value)}>
          <option value="">Все клиенты</option>
          {clients.map((c) => <option key={c.tenant_id} value={c.tenant_id}>{c.business_name}</option>)}
        </select>
        <select className={`${aInput} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | "")}>
          <option value="">Все статусы</option>
          {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className={aBtn} onClick={() => setIssue(true)}><Plus className="h-3.5 w-3.5" />Выставить счёт</button>
      </div>
      <TableWrap>
        <thead><tr>{["№", "Клиент", "Вид", "Период", "Сумма", "Статус", "Выставлен", ""].map((h) => <th key={h} className={aTh}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className={`${aTd} font-semibold`}>{i.number}</td>
              <td className={aTd}>{i.business_name || names.get(i.tenant_id) || i.tenant_id}</td>
              <td className={aTd}>{PAYMENT_KIND_LABELS[i.kind] ?? i.kind}</td>
              <td className={aTd}>{formatPeriod(i.period)}</td>
              <td className={aTd}>{formatRub(i.amount_kop)}</td>
              <td className={aTd}><Pill tone={i.status === "paid" ? "good" : i.status === "cancelled" ? "mute" : "warn"}>{INVOICE_STATUS_LABELS[i.status]}</Pill></td>
              <td className={aTd}>{formatDate(i.issued_at)}</td>
              <td className={`${aTd} whitespace-nowrap space-x-1`}>
                <button className={aBtnGhost} onClick={() => act(() => api.adminOpenInvoiceHtml(i.id), "Счёт открыт")}><FileText className="h-3 w-3" />Печать</button>
                {i.status === "issued" && (
                  <>
                    <button className={aBtn} onClick={() => act(() => api.adminMarkInvoicePaid(i.id), "Оплата записана", `Отметить счёт №${i.number} оплаченным? Будет записан платёж и начислены вознаграждения.`)}>Оплачен</button>
                    <button className={aBtnDanger} onClick={() => act(() => api.adminCancelInvoice(i.id), "Счёт отменён", `Отменить счёт №${i.number}?`)}>Отменить</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className={`${aTd} text-center text-zinc-500 py-6`}>Счетов нет</td></tr>}
        </tbody>
      </TableWrap>
      {(issue || issueFor) && (
        <IssueModal clients={clients} tariffs={tariffs} preset={issueFor ?? undefined} toast={toast}
          onClose={() => { setIssue(false); clearIssue(); }}
          onDone={() => { setIssue(false); clearIssue(); void load(); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- payments
function PaymentsTab({ clients, toast }: { clients: BillingClient[]; toast: T }) {
  const [tenant, setTenant] = useState("");
  const [kind, setKind] = useState<PaymentKind>("subscription");
  const [period, setPeriod] = useState(currentPeriod());
  const [amount, setAmount] = useState(0);
  const [paidAt, setPaidAt] = useState("");
  const [rows, setRows] = useState<AdminPayment[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!tenant) { setRows([]); return; }
    try { setRows(await api.adminListPayments(tenant)); } catch (e) { toast.fail(e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Записать платёж ${formatRub(amount)} (${PAYMENT_KIND_LABELS[kind]}, ${period}) без счёта? Будут начислены вознаграждения.`)) return;
    setBusy(true);
    try {
      await api.adminRecordPayment({ tenant_id: tenant, kind, amount_kop: amount, period, ...(paidAt ? { paid_at: paidAt } : {}) });
      toast.show("success", "Платёж записан");
      void load();
    } catch (err) {
      toast.fail(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 grid sm:grid-cols-3 gap-3">
        <F label="Клиент">
          <select required className={aInput} value={tenant} onChange={(e) => setTenant(e.target.value)}>
            <option value="">Выберите...</option>
            {clients.map((c) => <option key={c.tenant_id} value={c.tenant_id}>{c.business_name}</option>)}
          </select>
        </F>
        <F label="Вид">
          <select className={aInput} value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
            {KINDS.map((k) => <option key={k} value={k}>{PAYMENT_KIND_LABELS[k]}</option>)}
          </select>
        </F>
        <F label="Период (ГГГГ-ММ)"><input required pattern="\d{4}-\d{2}" className={aInput} value={period} onChange={(e) => setPeriod(e.target.value)} /></F>
        <F label="Сумма, ₽"><RubInput kop={amount} onChange={setAmount} /></F>
        <F label="Дата оплаты" hint="Пусто: сегодня"><input type="date" className={aInput} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></F>
        <div className="flex items-end"><button type="submit" disabled={busy || !tenant || amount <= 0} className={aBtn}>Записать платёж</button></div>
      </form>
      {tenant && (
        <TableWrap>
          <thead><tr>{["Период", "Вид", "Сумма", "Оплачен", "Счёт"].map((h) => <th key={h} className={aTh}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={aTd}>{formatPeriod(p.period)}</td>
                <td className={aTd}>{PAYMENT_KIND_LABELS[p.kind] ?? p.kind}</td>
                <td className={aTd}>{formatRub(p.amount_kop)}</td>
                <td className={aTd}>{formatDate(p.paid_at)}</td>
                <td className={aTd}>{p.invoice_id ? "да" : "без счёта"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className={`${aTd} text-center text-zinc-500 py-6`}>Платежей нет</td></tr>}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tariffs
function TariffRow({ t, onSaved, toast }: { t: Tariff; onSaved: () => void; toast: T }) {
  const [v, setV] = useState(t);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(t);
  const save = async () => {
    setBusy(true);
    try {
      const { id: _id, ...body } = v;
      void _id;
      await api.adminUpdateTariff(t.id, body);
      toast.show("success", "Тариф сохранён");
      onSaved();
    } catch (e) {
      toast.fail(e);
    } finally {
      setBusy(false);
    }
  };
  const w = "!px-2 !py-1.5";
  return (
    <tr>
      <td className={`${aTd} font-mono`}>{v.code}</td>
      <td className={aTd}><input className={`${aInput} ${w} min-w-28`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></td>
      <td className={aTd}><RubInput kop={v.monthly_kop} onChange={(k) => setV({ ...v, monthly_kop: k })} className={`${aInput} ${w} w-24`} /></td>
      <td className={aTd}><RubInput kop={v.launch_kop} onChange={(k) => setV({ ...v, launch_kop: k })} className={`${aInput} ${w} w-24`} /></td>
      <td className={aTd}><input inputMode="numeric" className={`${aInput} ${w} w-24`} value={v.messages_limit} onChange={(e) => setV({ ...v, messages_limit: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} /></td>
      <td className={aTd}><RubInput kop={v.pack_kop} onChange={(k) => setV({ ...v, pack_kop: k })} className={`${aInput} ${w} w-24`} /></td>
      <td className={aTd}><input inputMode="numeric" className={`${aInput} ${w} w-16`} value={v.sort} onChange={(e) => setV({ ...v, sort: Math.floor(Number(e.target.value) || 0) })} /></td>
      <td className={aTd}><input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /></td>
      <td className={aTd}><button className={aBtn} disabled={!dirty || busy} onClick={save}>Сохранить</button></td>
    </tr>
  );
}

function TariffsTab({ tariffs, reload, toast }: { tariffs: Tariff[]; reload: () => void; toast: T }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminCreateTariff({ code: code.trim(), name: name.trim(), monthly_kop: 0, launch_kop: 0, messages_limit: 0, pack_kop: 0, is_active: true, sort: tariffs.length + 1 });
      toast.show("success", "Тариф создан, заполните цены");
      setCode(""); setName("");
      reload();
    } catch (err) {
      toast.fail(err);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-500">Цены в рублях. Тарифы не удаляются: снимите «Активен». Смена цены влияет только на новые счета.</p>
      <TableWrap>
        <thead><tr>{["Код", "Название", "В месяц, ₽", "Запуск, ₽", "Сообщений", "Пакет, ₽", "Порядок", "Активен", ""].map((h) => <th key={h} className={aTh}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tariffs.map((t) => <TariffRow key={t.id + JSON.stringify(t)} t={t} onSaved={reload} toast={toast} />)}
        </tbody>
      </TableWrap>
      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <F label="Новый тариф: код"><input required className={`${aInput} !w-32`} value={code} onChange={(e) => setCode(e.target.value)} /></F>
        <F label="Название"><input required className={`${aInput} !w-44`} value={name} onChange={(e) => setName(e.target.value)} /></F>
        <button type="submit" className={aBtn}><Plus className="h-3.5 w-3.5" />Добавить</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- settings
const SELLER_FIELDS: Array<[keyof SellerRequisites, string]> = [
  ["name", "Название / ФИО"], ["inn", "ИНН"], ["ogrnip", "ОГРНИП / ОГРН"], ["address", "Адрес"], ["bank", "Банк"], ["bik", "БИК"],
  ["account", "Расчётный счёт"], ["corr_account", "Корр. счёт"], ["email", "Email"], ["phone", "Телефон"], ["vat_note", "Пометка про НДС"],
];
const COLS = ["Продавец", "Агентство 1", "Агентство 2"];

function SplitEditor({ value, onChange }: { value: SplitRates; onChange: (v: SplitRates) => void }) {
  const setCell = (deal: PartnerDealType, mode: "launch" | "monthly", d: number, i: number, bp: number) => {
    const next: SplitRates = JSON.parse(JSON.stringify(value));
    next[deal][mode][d][i] = bp;
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {(["rep", "manager"] as const).map((deal) =>
        (["launch", "monthly"] as const).map((mode) => (
          <div key={deal + mode} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="text-xs font-bold mb-2 text-zinc-900 dark:text-white">
              {DEAL_TYPE_LABELS[deal]}, {mode === "launch" ? "запуск" : "ежемесячно"}, % от оплаты клиента
            </div>
            <table className="text-xs">
              <thead>
                <tr>
                  <th className={aTh}>Цепочка</th>
                  {COLS.map((c) => <th key={c} className={aTh}>{c}</th>)}
                  <th className={aTh}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((d) => {
                  const row = value[deal][mode][d] ?? [];
                  const sum = row.reduce((a, b) => a + b, 0);
                  const bad = sum > 10000;
                  return (
                    <tr key={d}>
                      <td className={aTd}>{d === 0 ? "Без агентств" : d === 1 ? "1 агентство" : "2 агентства"}</td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className={aTd}>
                          {i <= d ? <PctInput bp={row[i] ?? 0} onChange={(bp) => setCell(deal, mode, d, i, bp)} /> : <span className="text-zinc-400">-</span>}
                        </td>
                      ))}
                      <td className={`${aTd} font-bold ${bad ? "text-red-600" : ""}`}>{sum / 100}%{bad && " (больше 100%)"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

function SettingsTab({ toast }: { toast: T }) {
  const [s, setS] = useState<BillingSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.adminGetBillingSettings().then(setS).catch(toast.fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!s) return <div className="text-xs text-zinc-500">Загрузка...</div>;
  const rowsOk = (["rep", "manager"] as const).every((d) =>
    (["launch", "monthly"] as const).every((m) => s.split_rates[d][m].every((r) => r.reduce((a, b) => a + b, 0) <= 10000))
  );
  const day = (n: number) => Number.isInteger(n) && n >= 1 && n <= 28;
  const dayOk = day(s.payout_day) && day(s.close_day ?? 11);
  const save = async () => {
    setBusy(true);
    try {
      await api.adminPutBillingSettings(s);
      toast.show("success", "Настройки сохранены");
    } catch (e) {
      toast.fail(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <p className="text-[11px] text-zinc-500">Изменения ставок влияют только на новые начисления: в каждом начислении хранится его ставка.</p>
      <SplitEditor value={s.split_rates} onChange={(v) => setS({ ...s, split_rates: v })} />
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
        <F label="Минимальная выплата, ₽"><RubInput kop={s.min_payout_kop} onChange={(k) => setS({ ...s, min_payout_kop: k })} /></F>
        <F label="День закрытия месяца (1-28)" hint="Клиенты оплачивают счёт до этого дня; утром этого дня прошлый месяц закрывается сам, роли партнёров пересчитываются. Оплата позже попадает в следующий месяц">
          <input inputMode="numeric" className={aInput} value={s.close_day ?? 11} onChange={(e) => setS({ ...s, close_day: Math.floor(Number(e.target.value) || 0) })} />
        </F>
        <F label="День выплаты (1-28)" hint={`Не раньше дня закрытия: сейчас выплаты ${Math.max(s.payout_day, s.close_day ?? 11)}-го числа`}>
          <input inputMode="numeric" className={aInput} value={s.payout_day} onChange={(e) => setS({ ...s, payout_day: Math.floor(Number(e.target.value) || 0) })} />
        </F>
      </div>
      <div>
        <div className="text-xs font-bold mb-2 text-zinc-900 dark:text-white">Реквизиты продавца (попадают в счёт)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SELLER_FIELDS.map(([k, l]) => (
            <F key={k} label={l}>
              <input className={aInput} value={s.seller?.[k] ?? ""} onChange={(e) => setS({ ...s, seller: { ...s.seller, [k]: e.target.value } })} />
            </F>
          ))}
        </div>
      </div>
      {!rowsOk && <div className="text-xs font-semibold text-red-600">В одной из строк сумма долей больше 100%: сохранить нельзя.</div>}
      {!dayOk && <div className="text-xs font-semibold text-red-600">Дни закрытия и выплаты: числа от 1 до 28.</div>}
      <button className={aBtn} disabled={busy || !rowsOk || !dayOk} onClick={save}>Сохранить настройки</button>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function AdminBillingPage() {
  const toast = useToastLocal();
  const [tab, setTab] = useState<Tab>("clients");
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [edit, setEdit] = useState<BillingClient | null>(null);
  const [issueFor, setIssueFor] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([api.adminListBillingClients(), api.adminListTariffs()]);
      setClients(c);
      setTariffs(t);
    } catch (e) {
      toast.fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = clients.filter((c) => !q.trim() || c.business_name.toLowerCase().includes(q.trim().toLowerCase()) || c.tenant_id.includes(q.trim().toLowerCase()));

  return (
    <AdminFrame title="Биллинг" subtitle="Клиенты и тарифы, счета, платежи, ставки партнёрской программы" toast={toast.toast}>
      <Tabs tabs={[["clients", "Клиенты"], ["invoices", "Счета"], ["payments", "Платежи"], ["tariffs", "Тарифы"], ["settings", "Настройки"]]} value={tab} onChange={setTab} />

      {tab === "clients" && (
        <div className="space-y-3">
          <input className={`${aInput} max-w-sm`} placeholder="Поиск по названию или id" value={q} onChange={(e) => setQ(e.target.value)} />
          <TableWrap>
            <thead><tr>{["Клиент", "Тариф", "Статус", "Партнёр", "Последняя оплата", "Неоплаченных счетов", ""].map((h) => <th key={h} className={aTh}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {shown.map((c) => (
                <tr key={c.tenant_id}>
                  <td className={aTd}><div className="font-semibold">{c.business_name}</div><div className="text-[10px] text-zinc-500">{c.tenant_id}</div></td>
                  <td className={aTd}>{c.tariff_name || tariffs.find((t) => t.id === c.tariff_id)?.name || "-"}</td>
                  <td className={aTd}>{c.status ? <Pill tone={c.status === "paying" ? "good" : c.status === "churned" ? "bad" : c.status === "paused" ? "warn" : "info"}>{CLIENT_STATUS_LABELS[c.status]}</Pill> : "-"}</td>
                  <td className={aTd}>{c.partner ? `${c.partner.name ?? c.partner.ref_code}, ${DEAL_TYPE_LABELS[c.partner.deal_type]}` : "-"}</td>
                  <td className={aTd}>{c.last_payment_period ? formatPeriod(c.last_payment_period) : "-"}</td>
                  <td className={aTd}>{c.unpaid_invoices ? <Pill tone="warn">{c.unpaid_invoices}</Pill> : "0"}</td>
                  <td className={`${aTd} whitespace-nowrap space-x-1`}>
                    <button className={aBtnGhost} onClick={() => setEdit(c)}><Pencil className="h-3 w-3" />Изменить</button>
                    <button className={aBtnGhost} onClick={() => { setIssueFor(c.tenant_id); setTab("invoices"); }}><FileText className="h-3 w-3" />Счёт</button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className={`${aTd} text-center text-zinc-500 py-6`}>Клиентов нет</td></tr>}
            </tbody>
          </TableWrap>
        </div>
      )}
      {tab === "invoices" && <InvoicesTab clients={clients} tariffs={tariffs} toast={toast} issueFor={issueFor} clearIssue={() => setIssueFor(null)} />}
      {tab === "payments" && <PaymentsTab clients={clients} toast={toast} />}
      {tab === "tariffs" && <TariffsTab tariffs={tariffs} reload={load} toast={toast} />}
      {tab === "settings" && <SettingsTab toast={toast} />}

      {edit && <ClientModal c={edit} tariffs={tariffs} toast={toast} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void load(); }} />}
    </AdminFrame>
  );
}
