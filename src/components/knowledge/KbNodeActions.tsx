"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import type { KbNodeAction, KbActionKind, KbActionsDisposition, NewKbNodeAction } from "@/types";

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-base";
const btnCls =
  "rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer";
const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1";

export const ACTION_LABELS: Record<KbActionKind, string> = {
  turn_off: "Выключить",
  turn_on: "Включить",
  change_text: "Изменить текст",
  soft_delete: "Удалить (скрыть насовсем)",
  ask_manager: "Спросить менеджера",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  done: "Выполнено",
  cancelled: "Отменено",
  failed: "Ошибка",
};

export function formatRunAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function preview(a: { action: KbActionKind; payload?: { content?: string; summary?: string; question?: string } | null }): string {
  const p = a.payload || {};
  if (a.action === "change_text") return [p.summary, p.content].filter(Boolean).join(" — ");
  if (a.action === "ask_manager") return p.question || "";
  if (a.action === "turn_off") return "Статья останется в списке, но Вера перестанет её использовать";
  if (a.action === "turn_on") return "Статья снова станет доступна Вере";
  return "Статья перестанет попадать к Вере и исчезнет из базы знаний";
}

/** Dated-text heuristic (#260): dd.mm.yyyy, «29 октября», «до 1 ноября», ISO dates. */
const MONTHS = "(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)";
const DATED_RE = new RegExp(
  `\\b\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}\\s+${MONTHS}`,
  "i"
);
export function looksDated(...texts: string[]): boolean {
  return texts.some((t) => DATED_RE.test(t || ""));
}

export function toNewAction(a: KbNodeAction): NewKbNodeAction {
  return { action: a.action, run_at: a.run_at, payload: a.payload || {} };
}

/** Add form. Returns a NewKbNodeAction (run_at as RFC 3339 with offset from the local date-time picker). */
function ActionForm({
  onSubmit,
  busy,
  submitLabel = "Запланировать",
}: {
  onSubmit: (a: NewKbNodeAction) => void | Promise<void>;
  busy?: boolean;
  submitLabel?: string;
}) {
  const [kind, setKind] = useState<KbActionKind>("turn_off");
  const [when, setWhen] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [question, setQuestion] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    const d = new Date(when);
    if (!when || Number.isNaN(d.getTime())) return setErr("Укажите дату и время");
    if (d.getTime() <= Date.now()) return setErr("Время должно быть в будущем");
    let payload: NewKbNodeAction["payload"] = {};
    if (kind === "change_text") {
      if (!content.trim() || !summary.trim()) return setErr("Нужны новый текст и новое краткое описание");
      payload = { content, summary: summary.trim() };
    } else if (kind === "ask_manager") {
      if (!question.trim()) return setErr("Напишите вопрос менеджеру");
      payload = { question: question.trim() };
    }
    setErr("");
    await onSubmit({ action: kind, run_at: d.toISOString(), payload });
    setWhen("");
    setContent("");
    setSummary("");
    setQuestion("");
  };

  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Что сделать</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as KbActionKind)} className={inputCls}>
            {(Object.keys(ACTION_LABELS) as KbActionKind[]).map((k) => (
              <option key={k} value={k}>{ACTION_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Когда (ваше время)</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
        </div>
      </div>
      {kind === "change_text" && (
        <>
          <div>
            <label className={labelCls}>Новый текст статьи</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-base" />
          </div>
          <div>
            <label className={labelCls}>Новое краткое описание</label>
            <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} />
          </div>
        </>
      )}
      {kind === "ask_manager" && (
        <div>
          <label className={labelCls}>Вопрос менеджеру</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2}
            placeholder="Акция ещё действует? Нужно ли обновить цены?"
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-base" />
        </div>
      )}
      {kind === "turn_off" && (
        <p className="text-xs text-zinc-500">В назначенное время статья будет выключена: Вера перестанет её использовать, но статья останется в списке.</p>
      )}
      {kind === "turn_on" && (
        <p className="text-xs text-zinc-500">В назначенное время статья будет включена: Вера снова начнёт её использовать.</p>
      )}
      {kind === "soft_delete" && (
        <p className="text-xs text-zinc-500">В назначенное время статья будет удалена насовсем (скрыта из базы знаний). Если нужно лишь временно убрать её, выберите «Выключить».</p>
      )}
      {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
      <button type="button" disabled={busy} onClick={submit}
        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-40 cursor-pointer">
        {submitLabel}
      </button>
    </div>
  );
}

function ActionLine({ a, onCancel, busy }: { a: { action: KbActionKind; run_at: string; payload?: KbNodeAction["payload"] }; onCancel?: () => void; busy?: boolean }) {
  const text = preview(a);
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-900 dark:text-white">
          {ACTION_LABELS[a.action]} · {formatRunAt(a.run_at)}
        </div>
        {text && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-3 whitespace-pre-wrap">{text}</div>}
      </div>
      {onCancel && (
        <button type="button" disabled={busy} onClick={onCancel} className={btnCls}>
          Отменить
        </button>
      )}
    </div>
  );
}

/** «Запланированные действия» block of the node editor. Add / cancel go straight to the API. */
export function KbNodeActionsPanel({
  nodeId,
  actions,
  onChanged,
  showToast,
}: {
  nodeId: string | null;
  actions: KbNodeAction[];
  onChanged: () => void | Promise<void>;
  showToast: (type: "success" | "error", text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const pending = actions.filter((a) => a.status === "pending");
  const finished = actions.filter((a) => a.status !== "pending");

  const add = async (body: NewKbNodeAction) => {
    if (!nodeId) return;
    setBusy(true);
    try {
      await api.addKnowledgeNodeAction(nodeId, body);
      setAdding(false);
      await onChanged();
      showToast("success", "Действие запланировано");
    } catch (e: any) {
      showToast("error", e?.message || "Не удалось запланировать действие");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!nodeId) return;
    setBusy(true);
    try {
      await api.cancelKnowledgeNodeAction(nodeId, id);
      await onChanged();
      showToast("success", "Действие отменено");
    } catch (e: any) {
      showToast("error", e?.message || "Не удалось отменить действие");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={labelCls + " mb-0"}>Запланированные действия</div>
          <p className="text-xs text-zinc-500 mt-0.5">Выключить или включить статью, изменить текст, удалить или спросить менеджера в назначенное время.</p>
        </div>
        {nodeId && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={btnCls}>Добавить</button>
        )}
      </div>
      {!nodeId && <p className="text-xs text-zinc-500">Действия можно добавить после первого сохранения узла.</p>}
      {nodeId && pending.length === 0 && !adding && <p className="text-xs text-zinc-500">Ничего не запланировано.</p>}
      {pending.map((a) => (
        <ActionLine key={a.id} a={a} busy={busy} onCancel={() => cancel(a.id)} />
      ))}
      {adding && (
        <div className="space-y-2">
          <ActionForm onSubmit={add} busy={busy} />
          <button type="button" onClick={() => setAdding(false)} className={btnCls}>Закрыть форму</button>
        </div>
      )}
      {finished.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowDone((v) => !v)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer">
            {showDone ? "Скрыть выполненные" : `Выполненные и отменённые (${finished.length})`}
          </button>
          {showDone && (
            <div className="mt-2 space-y-1.5">
              {finished.map((a) => (
                <div key={a.id} className="rounded-xl bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">{ACTION_LABELS[a.action]}</span> · {formatRunAt(a.run_at)} ·{" "}
                  <span className={a.status === "failed" ? "text-red-600 dark:text-red-400" : ""}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                  {a.result && <div className="mt-0.5 whitespace-pre-wrap">{a.result}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Save dialog: the node has pending actions, the editor chooses what happens to them. */
export function ActionsDispositionDialog({
  title,
  actions,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  actions: KbNodeAction[];
  busy?: boolean;
  onConfirm: (d: KbActionsDisposition) => void | Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"keep" | "cancel" | "replace">("keep");
  const [list, setList] = useState<NewKbNodeAction[]>(actions.map(toNewAction));

  const submit = () => onConfirm(mode === "replace" ? { mode, actions: list } : { mode });

  const opt = (m: typeof mode, label: string, hint: string) => (
    <label className="flex items-start gap-2 cursor-pointer text-sm">
      <input type="radio" name="disp" checked={mode === m} onChange={() => setMode(m)} className="mt-1 accent-amber-500" />
      <span>
        <span className="font-semibold text-zinc-900 dark:text-white">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">У узла есть запланированные действия</h3>
          <p className="text-xs text-zinc-500 mt-1">«{title}»: после сохранения текст изменится. Что сделать с действиями?</p>
        </div>
        <div className="space-y-2">
          {actions.map((a) => <ActionLine key={a.id} a={a} />)}
        </div>
        <div className="space-y-3">
          {opt("keep", "Оставить все", "Действия сработают в срок для новой версии статьи.")}
          {opt("cancel", "Отменить все", "Ничего не будет выполнено.")}
          {opt("replace", "Изменить список", "Уберите лишнее или добавьте новые действия ниже.")}
        </div>
        {mode === "replace" && (
          <div className="space-y-2">
            {list.map((a, i) => (
              <ActionLine key={i} a={a} onCancel={() => setList(list.filter((_, j) => j !== i))} />
            ))}
            {list.length === 0 && <p className="text-xs text-zinc-500">Список пуст: старые действия будут отменены.</p>}
            <ActionForm submitLabel="Добавить в список" onSubmit={(a) => setList([...list, a])} />
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button type="button" disabled={busy} onClick={submit}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs disabled:opacity-40 cursor-pointer">
            {busy ? "Сохранение..." : "Сохранить"}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
