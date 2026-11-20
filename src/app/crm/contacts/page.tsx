"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, GitMerge, Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { ChannelBadge } from "@/components/channel-badge";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ImportPanel } from "@/components/crm/ImportPanel";
import { CrmGate, CrmTabs, CustomFieldInput, ErrorLine, SandboxTag, SectionTitle, Spinner, Timeline, cardCls, chatHref, customFromStrings, customToStrings, inputCls } from "@/components/crm/ui";
import { errText, formatRub, relativeTime } from "@/lib/crm";
import type { CrmContactDetail, CrmContactRow, CrmField, CrmPipeline } from "@/types";

const PAGE = 50;

function ContactList({ fields }: { fields: CrmField[] }) {
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [qd, setQd] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<CrmContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setQd(q.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const my = ++reqRef.current;
    setLoading(true);
    try {
      const res = await api.getCrmContacts({ q: qd || undefined, sandbox, limit: PAGE, offset });
      if (my !== reqRef.current) return;
      setRows(res.contacts || []);
      setTotal(res.total || 0);
      setError(null);
    } catch (e) {
      if (my === reqRef.current) setError(errText(e, "Не удалось загрузить контакты"));
    } finally {
      if (my === reqRef.current) setLoading(false);
    }
  }, [qd, sandbox, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const doExport = async () => {
    setExporting(true);
    try {
      await api.downloadCrmCsv("contacts", {}, "crm-contacts.csv");
    } catch (e) {
      showToast(errText(e, "Не удалось выгрузить CSV"), "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input className={`${inputCls} pl-9`} placeholder="Поиск по имени, телефону, e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sandbox}
            onChange={(e) => {
              setSandbox(e.target.checked);
              setOffset(0);
            }}
            className="h-4 w-4 accent-amber-500"
          />
          Показать тестовые
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen((v) => !v)}>
            <Upload className="h-3.5 w-3.5" />
            Импорт CSV
          </Button>
          <Button variant="secondary" size="sm" loading={exporting} onClick={doExport}>
            <Download className="h-3.5 w-3.5" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {importOpen && <ImportPanel fields={fields} onClose={() => setImportOpen(false)} onImported={load} />}
      <ErrorLine text={error} />

      {loading && rows.length === 0 ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
          {qd ? "Ничего не найдено." : "Контактов пока нет. Они появляются, когда Вера квалифицирует клиента, или после импорта CSV."}
        </p>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2.5 font-semibold">Имя</th>
                <th className="px-3 py-2.5 font-semibold">Телефон</th>
                <th className="px-3 py-2.5 font-semibold hidden md:table-cell">E-mail</th>
                <th className="px-3 py-2.5 font-semibold text-right">Сделки</th>
                <th className="px-3 py-2.5 font-semibold text-right hidden sm:table-cell">Чаты</th>
                <th className="px-3 py-2.5 font-semibold hidden lg:table-cell">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/contacts/?id=${encodeURIComponent(c.id)}`} className="font-semibold text-zinc-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-400">
                      {c.name || "Без имени"}
                    </Link>
                    {c.is_sandbox && (
                      <span className="ml-2">
                        <SandboxTag />
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{c.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hidden md:table-cell break-all">{c.email || "—"}</td>
                  <td className="px-3 py-2.5 text-right">{c.deals_count}</td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">{c.chats_count}</td>
                  <td className="px-3 py-2.5 text-zinc-500 hidden lg:table-cell">{relativeTime(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE && (
        <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} из {total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              Назад
            </Button>
            <Button variant="secondary" size="sm" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MergeBox({ contactId, contactName, onMerged }: { contactId: string; contactName: string; onMerged: () => void }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CrmContactRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.getCrmContacts({ q: q.trim(), sandbox: true, limit: 8 });
        setResults((res.contacts || []).filter((c) => c.id !== contactId));
      } catch (e) {
        setError(errText(e));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, contactId]);

  const merge = async (other: CrmContactRow) => {
    const ok = await confirm({
      title: "Объединить контакты?",
      text: `Контакт «${other.name || other.phone || other.email || "без имени"}» будет влит в «${contactName || "этот контакт"}»: чаты, сделки и история перейдут к нему, а второй контакт исчезнет. Отменить это нельзя.`,
      confirmLabel: "Объединить",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.mergeCrmContacts(contactId, other.id);
      setOpen(false);
      setQ("");
      onMerged();
    } catch (e) {
      setError(errText(e, "Не удалось объединить"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <ConfirmDialog />
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <GitMerge className="h-3.5 w-3.5" />
        Объединить с…
      </Button>
      {open && (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Найти другой контакт по имени, телефону, e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
          <ErrorLine text={error} />
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => merge(c)}
              className="w-full text-left p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-amber-500/60 bg-white dark:bg-zinc-900 transition-colors"
            >
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">{c.name || "Без имени"}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactView({ id, fields, pipelines }: { id: string; fields: CrmField[]; pipelines: CrmPipeline[] }) {
  const { showToast } = useToast();
  const [data, setData] = useState<CrmContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const contactFields = fields.filter((f) => f.entity === "contact");

  const load = useCallback(async () => {
    try {
      const d = await api.getCrmContact(id);
      setData(d);
      setName(d.contact.name || "");
      setPhone(d.contact.phone || "");
      setEmail(d.contact.email || "");
      setCustom(customToStrings(d.contact.custom, contactFields));
      setError(null);
    } catch (e) {
      setError(errText(e, "Контакт не найден"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fields]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorLine text={error} />;
  if (!data) return <Spinner />;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.patchCrmContact(id, { name, phone, email, custom: customFromStrings(custom, contactFields) });
      await load();
      showToast("Контакт сохранён", "success");
    } catch (e) {
      setSaveError(errText(e, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

  const stageName = (d: CrmContactDetail["deals"][number]) => d.stage_name;

  return (
    <div className="space-y-4">
      <Link href="/crm/contacts/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <ArrowLeft className="h-4 w-4" />
        Все контакты
      </Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className={`${cardCls} p-4 space-y-3`}>
            <div className="flex items-center gap-2">
              <SectionTitle>Контакт</SectionTitle>
              {data.contact.is_sandbox && <SandboxTag />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Имя</span>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Телефон</span>
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">E-mail</span>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {contactFields.map((f) => (
                <label key={f.id} className="block">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{f.label}</span>
                  <CustomFieldInput field={f} value={custom[f.key] ?? ""} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} />
                </label>
              ))}
            </div>
            <ErrorLine text={saveError} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <MergeBox
                contactId={id}
                contactName={data.contact.name || ""}
                onMerged={() => {
                  showToast("Контакты объединены", "success");
                  load();
                }}
              />
              <Button onClick={save} loading={saving}>
                Сохранить
              </Button>
            </div>
          </div>

          <div className={`${cardCls} p-4 space-y-3`}>
            <SectionTitle>История</SectionTitle>
            <Timeline activity={data.activity} pipelines={pipelines} fields={fields} />
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className={`${cardCls} p-4 space-y-2`}>
            <SectionTitle>Сделки</SectionTitle>
            {data.deals.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Сделок нет.</p>
            ) : (
              data.deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/crm/deals/?id=${encodeURIComponent(d.id)}`}
                  className="block p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 hover:border-amber-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{d.title || "Без названия"}</span>
                    <span className="text-xs font-bold shrink-0">{formatRub(d.amount_rub)}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {d.pipeline_name} · {stageName(d)}
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className={`${cardCls} p-4 space-y-2`}>
            <SectionTitle>Чаты</SectionTitle>
            {data.chats.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Чатов нет.</p>
            ) : (
              data.chats.map((c) => (
                <Link
                  key={c.session_id}
                  href={chatHref(c.session_id)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 hover:border-amber-500/50 transition-colors"
                >
                  <ChannelBadge channel={c.channel} />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Открыть чат</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Inner() {
  const id = useSearchParams().get("id");
  return (
    <CrmGate>
      {({ fields, pipelines, canEditSettings }) =>
        id ? (
          <ContactView key={id} id={id} fields={fields} pipelines={pipelines} />
        ) : (
          <>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">CRM</h1>
            <CrmTabs active="contacts" canEditSettings={canEditSettings} />
            <ContactList fields={fields} />
          </>
        )
      }
    </CrmGate>
  );
}

export default function CrmContactsPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <Suspense fallback={<Spinner />}>
        <Inner />
      </Suspense>
    </div>
  );
}
