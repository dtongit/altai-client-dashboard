"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { ChannelBadge } from "@/components/channel-badge";
import { Button } from "@/components/ui/Button";
import { CrmGate, CustomFieldInput, ErrorLine, SandboxTag, SectionTitle, Spinner, Timeline, cardCls, chatHref, customFromStrings, customToStrings, inputCls } from "@/components/crm/ui";
import { errText, formatRub } from "@/lib/crm";
import type { CrmDealDetail, CrmField, CrmPipeline } from "@/types";

function DealView({ id, fields, pipelines }: { id: string; fields: CrmField[]; pipelines: CrmPipeline[] }) {
  const { showToast } = useToast();
  const [data, setData] = useState<CrmDealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [summary, setSummary] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const dealFields = fields.filter((f) => f.entity === "deal");

  const apply = useCallback(
    (d: CrmDealDetail) => {
      setData(d);
      setTitle(d.deal.title || "");
      setAmount(d.deal.amount_rub === null || d.deal.amount_rub === undefined ? "" : String(d.deal.amount_rub));
      setSummary(d.deal.summary || "");
      setCustom(customToStrings(d.deal.custom, dealFields));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields]
  );

  const load = useCallback(async () => {
    try {
      apply(await api.getCrmDeal(id));
      setError(null);
    } catch (e) {
      setError(errText(e, "Сделка не найдена"));
    }
  }, [id, apply]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorLine text={error} />;
  if (!data) return <Spinner />;
  const { deal, contact, chats } = data;
  const pipeline = data.pipeline || pipelines.find((p) => p.id === deal.pipeline_id) || null;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = { title, summary, custom: customFromStrings(custom, dealFields) };
      body.amount_rub = amount.trim() === "" ? null : Number(amount);
      await api.patchCrmDeal(id, body as any);
      await load();
      showToast("Сделка сохранена", "success");
    } catch (e) {
      setSaveError(errText(e, "Не удалось сохранить"));
    } finally {
      setSaving(false);
    }
  };

  const moveTo = async (stageId: string) => {
    setSaveError(null);
    try {
      await api.moveCrmDeal(id, stageId);
      await load();
    } catch (e) {
      setSaveError(errText(e, "Не удалось переместить сделку"));
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await api.addCrmDealNote(id, note.trim());
      setNote("");
      await load();
    } catch (e) {
      setNoteError(errText(e, "Не удалось добавить заметку"));
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/crm/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <ArrowLeft className="h-4 w-4" />
        Все сделки
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className={`${cardCls} p-4 space-y-3`}>
            <div className="flex items-center gap-2">
              <SectionTitle>Сделка</SectionTitle>
              {deal.is_sandbox && <SandboxTag />}
            </div>
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Название</span>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Сумма, ₽ {amount && !isNaN(Number(amount)) ? `(${formatRub(Number(amount))})` : ""}</span>
                <input className={inputCls} type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Этап</span>
                <select className={inputCls} value={deal.stage_id} onChange={(e) => moveTo(e.target.value)}>
                  {(pipeline?.stages || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Суть запроса</span>
              <textarea className={inputCls} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            {dealFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dealFields.map((f) => (
                  <label key={f.id} className="block">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{f.label}</span>
                    <CustomFieldInput field={f} value={custom[f.key] ?? ""} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} />
                  </label>
                ))}
              </div>
            )}
            <ErrorLine text={saveError} />
            <div className="flex justify-end">
              <Button onClick={save} loading={saving}>
                Сохранить
              </Button>
            </div>
          </div>

          <div className={`${cardCls} p-4 space-y-3`}>
            <SectionTitle>История</SectionTitle>
            <div className="space-y-2">
              <textarea className={inputCls} rows={2} placeholder="Добавить заметку" value={note} onChange={(e) => setNote(e.target.value)} />
              <ErrorLine text={noteError} />
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={addNote} loading={noteBusy} disabled={!note.trim()}>
                  Добавить заметку
                </Button>
              </div>
            </div>
            <Timeline activity={data.activity} pipelines={pipelines} fields={fields} />
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className={`${cardCls} p-4 space-y-2`}>
            <SectionTitle>Контакт</SectionTitle>
            {contact ? (
              <>
                <Link href={`/crm/contacts/?id=${encodeURIComponent(contact.id)}`} className="block text-sm font-semibold text-zinc-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-400">
                  {contact.name || "Без имени"}
                </Link>
                {contact.phone && <div className="text-sm text-zinc-600 dark:text-zinc-400">{contact.phone}</div>}
                {contact.email && <div className="text-sm text-zinc-600 dark:text-zinc-400 break-all">{contact.email}</div>}
              </>
            ) : (
              <p className="text-sm text-zinc-500">Контакта нет.</p>
            )}
          </div>

          <div className={`${cardCls} p-4 space-y-2`}>
            <SectionTitle>Чаты</SectionTitle>
            {chats.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Чатов нет.</p>
            ) : (
              chats.map((c) => (
                <Link
                  key={c.session_id}
                  href={chatHref(c.session_id)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 hover:border-amber-500/50 transition-colors"
                >
                  <ChannelBadge channel={c.channel} />
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Открыть чат
                  </span>
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
      {({ fields, pipelines }) => (id ? <DealView key={id} id={id} fields={fields} pipelines={pipelines} /> : <ErrorLine text="Сделка не указана" />)}
    </CrmGate>
  );
}

export default function CrmDealPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <Suspense fallback={<Spinner />}>
        <Inner />
      </Suspense>
    </div>
  );
}
