"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  TeamTraceEvent,
  TeamTraceModelTotals,
  TeamTraceResponse,
  TeamTraceStep,
  TeamTraceTurn,
} from "@/types";
import { formatDateTime, fmtUsd } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  FileText,
  GitCommit,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const fmtTok = (v: number) => (v || 0).toLocaleString("ru-RU");

/** `~anthropic/claude-haiku-latest` -> `haiku`. The full id stays in the tooltip. */
const shortModel = (m: string) =>
  m
    .split("/")
    .pop()!
    .replace(/^~/, "")
    .replace(/^claude-/, "")
    .replace(/-latest$/, "");

const callsRu = (n: number) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} вызов`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} вызова`;
  return `${n} вызовов`;
};

const pretty = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

const CHANGESET_EVENT_RU: Record<string, string> = {
  submitted: "отправлен на проверку",
  awaiting_confirm: "ждёт подтверждения",
  applied: "применён",
  review_rejected: "проверка вернула на доработку",
  rejected: "отклонён проверкой",
  declined: "отклонён сотрудником",
  rolled_back: "откачен",
  expired: "истёк",
};

const STATUS_RU: Record<string, string> = {
  draft: "черновик",
  in_review: "на проверке",
  awaiting_confirm: "ждёт подтверждения",
  applied: "применён",
  rejected: "отклонён",
  expired: "истёк",
  rolled_back: "откачен",
  failed: "ошибка применения",
};

const statusCls = (status: string) => {
  if (status === "applied") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (status === "awaiting_confirm" || status === "in_review" || status === "draft")
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  if (status === "rolled_back") return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
};

const verdictCls = (v: string) =>
  v === "accept_auto"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : v === "accept_confirm"
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

const badgeBase = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border";
const grayBadge = `${badgeBase} bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700`;
const errBadge = `${badgeBase} bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20`;
const preCls =
  "p-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap break-words max-h-96 overflow-y-auto";

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{label}</span>
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  return <pre className={preCls}>{pretty(value)}</pre>;
}

function Usage({ s }: { s: TeamTraceStep }) {
  return (
    <>
      {(s.prompt_tokens > 0 || s.completion_tokens > 0) && (
        <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
          <Cpu className="h-3 w-3 text-purple-500" />
          {fmtTok(s.prompt_tokens)} in / {fmtTok(s.completion_tokens)} out
        </span>
      )}
      {s.cost_usd > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium text-[11px]">{fmtUsd(s.cost_usd)}</span>
      )}
      {s.latency_ms > 0 && (
        <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
          <Clock className="h-3 w-3 text-amber-500" />
          {s.latency_ms} ms
        </span>
      )}
    </>
  );
}

function StepFrame({
  n,
  icon,
  title,
  badges,
  error,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: React.ReactNode;
  badges?: React.ReactNode;
  error?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold">
          {n}
        </div>
        <div className="flex-1 w-px bg-zinc-200 dark:bg-zinc-800 mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-3 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-zinc-500">{icon}</span>
          <span className="font-semibold text-zinc-900 dark:text-white">{title}</span>
          {badges}
        </div>
        {error && (
          <div className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-600 dark:text-red-400 font-mono break-words">
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function ChangesetDetail({ step }: { step: TeamTraceStep }) {
  const cs = step.changeset;
  const event = step.input?.event as string | undefined;
  return (
    <>
      {cs?.summary && <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">«{cs.summary}»</p>}
      {cs?.failure_reason && <p className="text-[11px] text-red-600 dark:text-red-400">{cs.failure_reason}</p>}
      {cs && cs.edits.length > 0 && (
        <Collapsible label={`Правки: ${cs.edits.length}`}>
          <div className="space-y-2">
            {cs.edits.map((e, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{e.description}</div>
                <pre className={preCls}>{e.diff || "(без diff)"}</pre>
              </div>
            ))}
          </div>
        </Collapsible>
      )}
      {!cs && <p className="text-[11px] text-zinc-400">Пакет {step.changeset_id} больше не найден (удалён).</p>}
      {event && <span className="hidden">{event}</span>}
    </>
  );
}

function StepView({ step, n, llmNo }: { step: TeamTraceStep; n: number; llmNo: number }) {
  if (step.input?.trace_removed) {
    return (
      <StepFrame n={n} icon={<FileText className="h-3.5 w-3.5" />} title="Трейс удалён">
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Подробности шага удалены по сроку хранения.</div>
      </StepFrame>
    );
  }
  if (step.kind === "prompt") {
    const tools: string[] = step.input?.tools || [];
    return (
      <StepFrame
        n={n}
        icon={<FileText className="h-3.5 w-3.5" />}
        title="Промпт"
        badges={
          <>
            <span className={grayBadge}>{fmtTok(step.input?.chars ?? 0)} симв.</span>
            <span className={grayBadge}>инструментов: {tools.length}</span>
            <span className={grayBadge}>история: {step.input?.history_messages ?? 0} сообщ.</span>
          </>
        }
      >
        <Collapsible label="Системный промпт и инструменты">
          <div className="space-y-2">
            <pre className={preCls}>{step.input?.system_prompt}</pre>
            <pre className={preCls}>{tools.join("\n")}</pre>
          </div>
        </Collapsible>
      </StepFrame>
    );
  }

  if (step.kind === "llm") {
    return (
      <StepFrame
        n={n}
        icon={<Cpu className="h-3.5 w-3.5 text-purple-500" />}
        title={`LLM #${llmNo}`}
        error={step.error}
        badges={
          <>
            {step.model && (
              <span className={`${badgeBase} bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`} title={step.model}>
                {shortModel(step.model)}
              </span>
            )}
            <Usage s={step} />
          </>
        }
      >
        <div className="flex gap-2 flex-wrap">
          <Collapsible label="Вход (новые сообщения)">
            <Json value={step.input?.messages} />
          </Collapsible>
          {step.output != null && (
            <Collapsible label="Выход (текст и вызовы инструментов)">
              <Json value={step.output} />
            </Collapsible>
          )}
        </div>
      </StepFrame>
    );
  }

  if (step.kind === "tool") {
    return (
      <StepFrame
        n={n}
        icon={<Wrench className="h-3.5 w-3.5 text-amber-500" />}
        title={<span className="font-mono">{step.input?.name}</span>}
        error={step.error}
        badges={<Usage s={step} />}
      >
        <div className="flex gap-2 flex-wrap">
          <Collapsible label="Аргументы">
            <Json value={step.input?.args} />
          </Collapsible>
          <Collapsible label="Результат">
            <Json value={step.output} />
          </Collapsible>
        </div>
      </StepFrame>
    );
  }

  if (step.kind === "reviewer") {
    const verdict = step.output?.verdict as string | undefined;
    const reasons: string[] = step.output?.reasons || [];
    return (
      <StepFrame
        n={n}
        icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
        title="Проверка изменений"
        error={step.error}
        badges={
          <>
            {step.model ? (
              <span className={`${badgeBase} bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`} title={step.model}>
                {shortModel(step.model)}
              </span>
            ) : (
              <span className={grayBadge}>проверка кодом</span>
            )}
            {step.input?.round != null && <span className={grayBadge}>раунд {step.input.round}</span>}
            {verdict && <span className={`${badgeBase} ${verdictCls(verdict)}`}>{verdict}</span>}
            <Usage s={step} />
          </>
        }
      >
        {reasons.length > 0 && (
          <ul className="list-disc pl-5 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 flex-wrap">
          <Collapsible label="Вход">
            <Json value={step.input} />
          </Collapsible>
          <Collapsible label="Выход (сырой ответ)">
            <Json value={step.output} />
          </Collapsible>
        </div>
      </StepFrame>
    );
  }

  // changeset
  const status = step.changeset?.status || step.output?.status || "";
  const event = (step.input?.event as string) || "";
  return (
    <StepFrame
      n={n}
      icon={<GitCommit className="h-3.5 w-3.5 text-amber-500" />}
      title="Пакет изменений"
      badges={
        <>
          <span className="text-[10px] font-mono text-zinc-400">{step.changeset_id}</span>
          <span className={`${badgeBase} ${statusCls(event === "declined" ? "rejected" : event === "review_rejected" ? "draft" : status)}`}>
            {CHANGESET_EVENT_RU[event] || event}
          </span>
          {status && <span className={grayBadge}>сейчас: {STATUS_RU[status] || status}</span>}
        </>
      }
    >
      <ChangesetDetail step={step} />
    </StepFrame>
  );
}

// ---------------------------------------------------------------------------
// Turn and event rows
// ---------------------------------------------------------------------------

function lastChangesetStatus(steps: TeamTraceStep[]): string | null {
  const cs = [...steps].reverse().find((s) => s.kind === "changeset");
  return cs ? cs.changeset?.status || cs.output?.status || null : null;
}

function TurnCard({ turn }: { turn: TeamTraceTurn }) {
  const [open, setOpen] = useState(false);
  const t = turn.trace_totals;
  const models = turn.has_trace ? t.models.map((m) => m.model) : turn.llm_model ? [turn.llm_model] : [];
  const tokensIn = turn.has_trace ? t.prompt_tokens : turn.prompt_tokens || 0;
  const tokensOut = turn.has_trace ? t.completion_tokens : turn.completion_tokens || 0;
  const cost = turn.has_trace ? t.cost_usd : turn.cost_usd || 0;
  const csStatus = lastChangesetStatus(turn.steps);
  let llmNo = 0;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span className="mt-0.5 text-zinc-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-500">{formatDateTime(turn.created_at)}</span>
            {models.map((m) => (
              <span key={m} className={`${badgeBase} bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`} title={m}>
                {shortModel(m)}
              </span>
            ))}
            {(tokensIn > 0 || tokensOut > 0) && (
              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <Cpu className="h-3 w-3 text-purple-500" />
                {fmtTok(tokensIn)} / {fmtTok(tokensOut)}
              </span>
            )}
            {cost > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium text-[11px]">{fmtUsd(cost)}</span>}
            {(turn.total_latency_ms || 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                <Clock className="h-3 w-3 text-amber-500" />
                {turn.total_latency_ms} ms
              </span>
            )}
            {csStatus && <span className={`${badgeBase} ${statusCls(csStatus)}`}>пакет: {STATUS_RU[csStatus] || csStatus}</span>}
            {turn.has_error && (
              <span className={errBadge}>
                <AlertTriangle className="h-3 w-3" />
                ошибка
              </span>
            )}
            {!turn.has_trace && <span className={grayBadge}>трейс не записан</span>}
          </div>
          <div className="text-xs text-zinc-900 dark:text-white truncate">
            <span className="text-zinc-400">Сотрудник: </span>
            {turn.user_message}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
            <span className="text-zinc-400">Вера: </span>
            {turn.bot_response}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs whitespace-pre-wrap break-words">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Сообщение сотрудника</div>
              {turn.user_message}
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs whitespace-pre-wrap break-words">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Ответ Веры</div>
              {turn.bot_response}
            </div>
          </div>
          {turn.has_trace ? (
            <div>
              {turn.steps.map((s, i) => {
                if (s.kind === "llm") llmNo += 1;
                return <StepView key={s.id} step={s} n={i + 1} llmNo={llmNo} />;
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Трейс не записан: ход был до включения трейса.</p>
          )}
          {turn.turn_id && <div className="text-[10px] font-mono text-zinc-400">{turn.turn_id}</div>}
        </div>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: TeamTraceEvent }) {
  const [open, setOpen] = useState(false);
  const event = (ev.input?.event as string) || "";
  const status = ev.changeset?.status || ev.output?.status || "";
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/30 px-4 py-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left flex items-center gap-2 flex-wrap text-xs">
        <span className="text-zinc-400">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
        <GitCommit className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[11px] text-zinc-500">{formatDateTime(ev.created_at)}</span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Пакет изменений</span>
        <span className={`${badgeBase} ${statusCls(event === "declined" ? "rejected" : status)}`}>{CHANGESET_EVENT_RU[event] || event}</span>
        <span className="text-[10px] font-mono text-zinc-400">{ev.changeset_id}</span>
        <span className="text-[11px] text-zinc-500">{ev.input?.actor}</span>
      </button>
      {open && (
        <div className="mt-2 pl-6 space-y-1.5">
          <ChangesetDetail step={ev} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------

function ModelChip({ m }: { m: TeamTraceModelTotals }) {
  return (
    <span
      className={`${badgeBase} bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`}
      title={`${m.model}: ${fmtTok(m.prompt_tokens)} in / ${fmtTok(m.completion_tokens)} out`}
    >
      {shortModel(m.model)} · {callsRu(m.calls)} · {fmtUsd(m.cost_usd, 4)}
    </span>
  );
}

export default function TeamTraceView({ telegramUserId, tenantId }: { telegramUserId: string; tenantId?: string }) {
  const [data, setData] = useState<TeamTraceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getTeamChatTrace(telegramUserId, tenantId, 50));
    } catch (e: any) {
      setError(e?.detail || e?.message || "Не удалось загрузить трейс");
    } finally {
      setLoading(false);
    }
  }, [telegramUserId, tenantId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const t = data?.totals;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2">
          {t && (
            <>
              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  Ходов: <strong className="text-zinc-900 dark:text-white">{t.turns}</strong>
                </span>
                <span>
                  Вызовов LLM: <strong className="text-zinc-900 dark:text-white">{t.llm_calls}</strong>
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Cpu className="h-3.5 w-3.5 text-purple-500" />
                  {fmtTok(t.prompt_tokens)} in / {fmtTok(t.completion_tokens)} out
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  <Coins className="h-3.5 w-3.5" />
                  {fmtUsd(t.cost_usd, 4)}
                </span>
              </div>
              {t.models.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {t.models.map((m) => (
                    <ModelChip key={m.model} m={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Обновить трейс"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">{error}</div>
      )}
      {!data && loading && <div className="p-12 text-center text-xs text-zinc-400">Загрузка трейса...</div>}
      {data && data.items.length === 0 && <div className="p-12 text-center text-xs text-zinc-400">Ходов пока нет</div>}
      {data?.items.map((it) =>
        it.type === "turn" ? <TurnCard key={it.id} turn={it} /> : <EventRow key={it.id} ev={it} />
      )}
      {data && data.totals.turns > data.items.filter((i) => i.type === "turn").length && (
        <p className="text-center text-[11px] text-zinc-400">Показаны последние 50 ходов из {data.totals.turns}.</p>
      )}
    </div>
  );
}
