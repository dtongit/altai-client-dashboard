"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, LayoutList, Kanban, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { ChannelBadge } from "@/components/channel-badge";
import { Button } from "@/components/ui/Button";
import { CrmGate, CrmTabs, ErrorLine, SandboxTag, Spinner, inputCls } from "@/components/crm/ui";
import { dealTitle, errText, formatRub, relativeTime, stageKindClasses } from "@/lib/crm";
import type { CrmDealRow, CrmPipeline, CrmStage } from "@/types";

const PERIODS = [
  { id: "all", label: "За всё время", days: 0 },
  { id: "7", label: "7 дней", days: 7 },
  { id: "30", label: "30 дней", days: 30 },
  { id: "90", label: "90 дней", days: 90 },
];

function sinceDate(days: number): string | undefined {
  if (!days) return undefined;
  const d = new Date(Date.now() - days * 86400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sumRub(deals: CrmDealRow[]): number {
  return deals.reduce((s, d) => s + (typeof d.amount_rub === "number" ? d.amount_rub : 0), 0);
}

function DealCard({ deal, onDragStart, onDragEnd, dragging }: { deal: CrmDealRow; onDragStart: (id: string) => void; onDragEnd: () => void; dragging: boolean }) {
  const amount = formatRub(deal.amount_rub);
  return (
    <Link
      href={`/crm/deals/?id=${encodeURIComponent(deal.id)}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", deal.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(deal.id);
      }}
      onDragEnd={onDragEnd}
      className={`block rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-3 shadow-xs hover:border-amber-500/60 transition-colors cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm font-semibold text-zinc-900 dark:text-white truncate">{dealTitle(deal)}</div>
        {amount && <div className="shrink-0 text-sm font-bold text-zinc-900 dark:text-zinc-100">{amount}</div>}
      </div>
      {deal.contact?.name && deal.title && deal.title !== deal.contact.name && (
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">{deal.title}</div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {deal.channel && <ChannelBadge channel={deal.channel} />}
        {deal.is_sandbox && <SandboxTag />}
      </div>
      <div className="mt-2 text-[11px] text-zinc-400">{relativeTime(deal.last_activity_at || deal.updated_at)}</div>
    </Link>
  );
}

function Board({ pipeline, deals, onMove }: { pipeline: CrmPipeline; deals: CrmDealRow[]; onMove: (dealId: string, stage: CrmStage) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 items-start">
      {pipeline.stages.map((st) => {
        const col = deals.filter((d) => d.stage_id === st.id);
        const total = sumRub(col);
        const isOver = overStage === st.id && dragId !== null;
        return (
          <div
            key={st.id}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverStage(st.id);
            }}
            onDragLeave={() => setOverStage((s) => (s === st.id ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              setOverStage(null);
              setDragId(null);
              if (id) onMove(id, st);
            }}
            className={`w-72 shrink-0 rounded-2xl border p-2.5 transition-colors ${
              st.kind === "won"
                ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30"
                : st.kind === "lost"
                ? "bg-zinc-100/70 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
            } ${isOver ? "ring-2 ring-amber-500" : ""}`}
          >
            <div className="px-1 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border truncate ${stageKindClasses(st.kind)}`}>{st.name}</span>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{col.length}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{total > 0 ? formatRub(total) : "—"}</div>
            </div>
            <div className={`space-y-2 min-h-[48px] ${st.kind === "lost" ? "opacity-80" : ""}`}>
              {col.map((d) => (
                <DealCard key={d.id} deal={d} dragging={dragId === d.id} onDragStart={setDragId} onDragEnd={() => { setDragId(null); setOverStage(null); }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealList({ pipeline, deals, onMove }: { pipeline: CrmPipeline; deals: CrmDealRow[]; onMove: (dealId: string, stage: CrmStage) => void }) {
  if (deals.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">Сделок по фильтру нет.</p>;
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
      {deals.map((d) => (
        <div key={d.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Link href={`/crm/deals/?id=${encodeURIComponent(d.id)}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{dealTitle(d)}</span>
              {d.is_sandbox && <SandboxTag />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              {d.channel && <ChannelBadge channel={d.channel} />}
              <span>{relativeTime(d.last_activity_at || d.updated_at)}</span>
            </div>
          </Link>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 sm:w-28 sm:text-right">{formatRub(d.amount_rub) || "—"}</div>
          <select
            aria-label="Этап сделки"
            value={d.stage_id}
            onChange={(e) => {
              const st = pipeline.stages.find((s) => s.id === e.target.value);
              if (st) onMove(d.id, st);
            }}
            className={`${inputCls} sm:w-44`}
          >
            {pipeline.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function BoardPage({ pipelines }: { pipelines: CrmPipeline[] }) {
  const { showToast } = useToast();
  const [pipelineId, setPipelineId] = useState<string>(() => (pipelines.find((p) => p.is_default) || pipelines[0])?.id || "");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [period, setPeriod] = useState("all");
  const [sandbox, setSandbox] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [deals, setDeals] = useState<CrmDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reqRef = useRef(0);

  // On phones (< 768 px) the list view is the default.
  useEffect(() => {
    if (window.innerWidth < 768) setView("list");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const pipeline = useMemo(() => pipelines.find((p) => p.id === pipelineId) || pipelines[0] || null, [pipelines, pipelineId]);
  const filters = useMemo(
    () => ({
      pipeline_id: pipeline?.id,
      q: qDebounced || undefined,
      since: sinceDate(PERIODS.find((p) => p.id === period)?.days || 0),
      sandbox,
    }),
    [pipeline?.id, qDebounced, period, sandbox]
  );

  const load = useCallback(async () => {
    if (!pipeline) return;
    const my = ++reqRef.current;
    setLoading(true);
    try {
      const res = await api.getCrmDeals({ ...filters, limit: 500 });
      if (my !== reqRef.current) return;
      setDeals(res.deals || []);
      setError(null);
    } catch (e) {
      if (my === reqRef.current) setError(errText(e, "Не удалось загрузить сделки"));
    } finally {
      if (my === reqRef.current) setLoading(false);
    }
  }, [pipeline, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic move with rollback.
  const move = useCallback(
    async (dealId: string, stage: CrmStage) => {
      const prev = deals.find((d) => d.id === dealId);
      if (!prev || prev.stage_id === stage.id) return;
      const now = new Date().toISOString();
      setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage_id: stage.id, last_activity_at: now } : d)));
      try {
        const res = await api.moveCrmDeal(dealId, stage.id);
        setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, ...res.deal } : d)));
      } catch (e) {
        setDeals((ds) => ds.map((d) => (d.id === dealId ? prev : d)));
        showToast(errText(e, "Не удалось переместить сделку"), "error");
      }
    },
    [deals, showToast]
  );

  const doExport = async () => {
    setExporting(true);
    try {
      await api.downloadCrmCsv("deals", filters, "crm-deals.csv");
    } catch (e) {
      showToast(errText(e, "Не удалось выгрузить CSV"), "error");
    } finally {
      setExporting(false);
    }
  };

  const noFilters = !qDebounced && period === "all" && !sandbox;
  const empty = !loading && !error && deals.length === 0 && noFilters;

  if (!pipeline) return <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6">Воронок пока нет. Создайте воронку на вкладке «Настройки».</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        <select aria-label="Воронка" value={pipeline.id} onChange={(e) => setPipelineId(e.target.value)} className={`${inputCls} lg:w-56`}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input className={`${inputCls} pl-9`} placeholder="Поиск по клиенту, телефону, названию" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Период" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${inputCls} lg:w-40`}>
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="h-4 w-4 accent-amber-500" />
          Показать тестовые
        </label>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden" role="group" aria-label="Вид">
            {([["kanban", Kanban, "Доска"], ["list", LayoutList, "Список"]] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  view === id ? "bg-amber-500 text-zinc-950 font-semibold" : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" loading={exporting} onClick={doExport}>
            <Download className="h-3.5 w-3.5" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {pipeline.description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{pipeline.description}</p>}
      <ErrorLine text={error} />

      {loading && deals.length === 0 ? (
        <Spinner />
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Сделок пока нет. Вера создаёт сделки сама, когда клиент квалифицирован: она заполняет карточку и переводит сделку по этапам воронки.
        </div>
      ) : view === "kanban" ? (
        <Board pipeline={pipeline} deals={deals} onMove={move} />
      ) : (
        <DealList pipeline={pipeline} deals={deals} onMove={move} />
      )}
    </div>
  );
}

export default function CrmPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">CRM</h1>
      <CrmGate>
        {({ pipelines, canEditSettings }) => (
          <>
            <CrmTabs active="deals" canEditSettings={canEditSettings} />
            <BoardPage pipelines={pipelines} />
          </>
        )}
      </CrmGate>
    </div>
  );
}
