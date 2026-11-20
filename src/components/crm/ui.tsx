"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FilePlus2,
  GitMerge,
  Link2,
  Loader2,
  MessageSquare,
  PencilLine,
  StickyNote,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { VeraFace } from "@/components/vera-face";
import { useCrmMeta, actorLabel, findStage, formatRub, fullDateTime, relativeTime } from "@/lib/crm";
import type { CrmActivity, CrmField, CrmPipeline } from "@/types";

export const inputCls =
  "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-60";

export const cardCls = "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{children}</div>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
    </div>
  );
}

export function ErrorLine({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
      {text}
    </div>
  );
}

export function SandboxTag() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25">
      песочница
    </span>
  );
}

/** Vera's face for `vera`, «Вера (руководитель)» for `boss_vera`, a person's name otherwise. */
export function Actor({ a }: { a: Pick<CrmActivity, "actor" | "actor_name"> }) {
  const isVera = a.actor === "vera" || a.actor === "boss_vera";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
      {isVera && <VeraFace className="h-4 w-4" />}
      {actorLabel(a)}
    </span>
  );
}

const TABS = [
  { id: "deals", href: "/crm", label: "Сделки" },
  { id: "contacts", href: "/crm/contacts", label: "Контакты" },
  { id: "settings", href: "/crm/settings", label: "Настройки" },
] as const;

export function CrmTabs({ active, canEditSettings }: { active: "deals" | "contacts" | "settings"; canEditSettings: boolean }) {
  return (
    <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
      {TABS.filter((t) => t.id !== "settings" || canEditSettings).map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === t.id
              ? "border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Wraps a CRM page: waits for `/crm/meta`, explains when the CRM is off, hands the meta to the page. */
export function CrmGate({
  children,
}: {
  children: (ctx: ReturnType<typeof useCrmMeta> & { canEditSettings: boolean }) => React.ReactNode;
}) {
  const ctx = useCrmMeta(true);
  if (!ctx.meta) {
    return <Spinner />;
  }
  if (!ctx.meta.enabled) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center text-sm text-zinc-600 dark:text-zinc-400">
        CRM Веры для этой компании не включена.
      </div>
    );
  }
  return <>{children({ ...ctx, canEditSettings: ctx.meta.can_edit_settings === true })}</>;
}

/** Input of a custom field by its type; value is kept as a string while editing. */
export function CustomFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: CrmField;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (field.type === "list") {
    const opts = field.options || [];
    return (
      <select className={inputCls} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {value && !opts.includes(value) && <option value={value}>{value}</option>}
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      className={inputCls}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function customToStrings(custom: Record<string, unknown> | null | undefined, fields: CrmField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = custom?.[f.key];
    out[f.key] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

/** Strings from the inputs back to typed values (empty -> null) for the PATCH body. */
export function customFromStrings(values: Record<string, string>, fields: CrmField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.key] ?? "";
    out[f.key] = raw === "" ? null : f.type === "number" ? Number(raw) : raw;
  }
  return out;
}

function asText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const KIND_ICON: Record<string, LucideIcon> = {
  created: FilePlus2,
  stage_changed: ArrowRight,
  field_changed: PencilLine,
  note: StickyNote,
  merged: GitMerge,
  imported: Upload,
  contact_created: UserPlus,
  chat_linked: Link2,
};

const FIELD_LABELS: Record<string, string> = {
  name: "Имя",
  phone: "Телефон",
  email: "E-mail",
  title: "Название",
  amount_rub: "Сумма",
  summary: "Описание",
};

/** One timeline row. Payload keys are read tolerantly (see the assumptions in the report). */
function ActivityBody({ a, pipelines, fields }: { a: CrmActivity; pipelines: CrmPipeline[]; fields: CrmField[] }) {
  const p = a.payload || {};
  const stageName = (v: unknown, nameKeyVal?: unknown) => {
    if (typeof nameKeyVal === "string" && nameKeyVal) return nameKeyVal;
    if (typeof v === "string" || typeof v === "number") return findStage(pipelines, String(v))?.name || String(v);
    return asText(v);
  };
  switch (a.kind) {
    case "stage_changed": {
      const from = stageName(p.from_stage_id ?? p.from_stage ?? p.from, p.from_name ?? p.from_stage_name);
      const to = stageName(p.to_stage_id ?? p.to_stage ?? p.to, p.to_name ?? p.to_stage_name);
      const evidence = p.evidence ?? p.reason;
      return (
        <>
          <div className="text-sm text-zinc-800 dark:text-zinc-200">
            Этап: <span className="text-zinc-500">{from}</span> → <span className="font-semibold">{to}</span>
          </div>
          {evidence ? <blockquote className="mt-1 border-l-2 border-amber-500/50 pl-2 text-xs text-zinc-500 dark:text-zinc-400 italic">{asText(evidence)}</blockquote> : null}
        </>
      );
    }
    case "field_changed": {
      const rawLabel = p.label ?? p.field ?? p.key ?? "Поле";
      const label =
        typeof rawLabel === "string" ? FIELD_LABELS[rawLabel] ?? fields.find((f) => f.key === rawLabel)?.label ?? rawLabel : rawLabel;
      const isAmount = rawLabel === "amount_rub";
      const show = (v: unknown) => (isAmount && typeof v === "number" ? formatRub(v) : asText(v));
      return (
        <div className="text-sm text-zinc-800 dark:text-zinc-200">
          {asText(label)}: <span className="text-zinc-500">{show(p.old ?? p.from ?? p.before)}</span> → <span className="font-semibold">{show(p.new ?? p.to ?? p.after)}</span>
        </div>
      );
    }
    case "note":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">{asText(p.text ?? p.note)}</div>;
    case "created":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200">Сделка создана{p.title ? `: ${asText(p.title)}` : ""}</div>;
    case "contact_created":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200">Контакт создан{p.name ? `: ${asText(p.name)}` : ""}</div>;
    case "merged":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200">Контакты объединены{p.merged_name || p.name ? `: ${asText(p.merged_name ?? p.name)}` : ""}</div>;
    case "imported":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200">Импортировано из CSV</div>;
    case "chat_linked":
      return <div className="text-sm text-zinc-800 dark:text-zinc-200">Привязан чат{p.channel ? ` (${asText(p.channel)})` : ""}</div>;
    default:
      return <div className="text-sm text-zinc-600 dark:text-zinc-400">{a.kind}</div>;
  }
}

export function Timeline({ activity, pipelines, fields = [] }: { activity: CrmActivity[]; pipelines: CrmPipeline[]; fields?: CrmField[] }) {
  if (activity.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Событий пока нет.</p>;
  return (
    <ul className="space-y-3">
      {activity.map((a) => {
        const Icon = KIND_ICON[a.kind] || MessageSquare;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Actor a={a} />
                <span className="text-[11px] text-zinc-400" title={fullDateTime(a.created_at)}>
                  {relativeTime(a.created_at)}
                </span>
              </div>
              <ActivityBody a={a} pipelines={pipelines} fields={fields} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function chatHref(sessionId: string): string {
  return `/chats/?session=${encodeURIComponent(sessionId)}`;
}
