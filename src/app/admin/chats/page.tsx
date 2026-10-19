"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  AdminChatTraceResponse,
  AdminInteractionLogTurn,
  AdminLLMStep,
  AdminToolExecution,
} from "@/types";
import { ChannelBadge } from "@/components/channel-badge";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  Copy,
  Check,
  Cpu,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  MessageSquare,
  Wrench,
  Sparkles,
  User,
  Bot,
  Database,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Code2,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

type FilterMode = "all" | "chat_only" | "tech_only";

export default function AdminChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-500 mr-2" />
          <span>Загрузка админ-панели диалогов...</span>
        </div>
      }
    >
      <AdminChatsContent />
    </Suspense>
  );
}

function AdminChatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const selectedSessionId =
    searchParams.get("session_id") || searchParams.get("sessionId") || null;

  // View state when a session is selected
  const [trace, setTrace] = useState<AdminChatTraceResponse | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // View state when browsing all sessions list
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }
  };

  // Load specific trace
  const loadTrace = async (sessId: string) => {
    setLoadingTrace(true);
    setTraceError(null);
    try {
      const data = await api.getAdminChatTrace(sessId);
      setTrace(data);
      const initialTurns: Record<number, boolean> = {};
      (data.turns || []).forEach((_, idx) => {
        initialTurns[idx] = true;
      });
      setExpandedTurns(initialTurns);
    } catch (e: any) {
      console.error("Failed to load admin chat trace:", e);
      setTraceError(e?.message || "Не удалось загрузить технический трейс диалога");
    } finally {
      setLoadingTrace(false);
    }
  };

  // Load all sessions list
  const loadSessionsList = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await api.listAdminChats({ search: listSearch || undefined, limit: 150 });
      if (res.sessions) {
        setSessions(res.sessions);
      }
    } catch (e: any) {
      console.error("Failed to list admin chats:", e);
      setListError(e?.message || "Не удалось загрузить список диалогов");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadTrace(selectedSessionId);
    } else {
      loadSessionsList();
    }
  }, [selectedSessionId]);

  const toggleTurn = (turnIndex: number) => {
    setExpandedTurns((prev) => ({
      ...prev,
      [turnIndex]: !prev[turnIndex],
    }));
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const expandAll = () => {
    if (!trace) return;
    const allTurns: Record<number, boolean> = {};
    const allSteps: Record<string, boolean> = {};
    trace.turns.forEach((turn, idx) => {
      allTurns[idx] = true;
      (turn.llm_steps || []).forEach((_, sIdx) => {
        allSteps[`${turn.id}_llm_${sIdx}`] = true;
      });
      (turn.tools_executed || []).forEach((_, tIdx) => {
        allSteps[`${turn.id}_tool_${tIdx}`] = true;
      });
    });
    setExpandedTurns(allTurns);
    setExpandedSteps(allSteps);
  };

  const collapseAll = () => {
    setExpandedTurns({});
    setExpandedSteps({});
  };

  // Filtered turns based on search query
  const filteredTurns = useMemo(() => {
    if (!trace?.turns) return [];
    if (!searchQuery.trim()) return trace.turns;
    const q = searchQuery.toLowerCase();
    return trace.turns.filter((turn) => {
      const matchMsg =
        (turn.user_message || "").toLowerCase().includes(q) ||
        (turn.assistant_response || "").toLowerCase().includes(q);
      const matchTools = JSON.stringify(turn.tools_executed || {}).toLowerCase().includes(q);
      const matchLLM = JSON.stringify(turn.llm_steps || {}).toLowerCase().includes(q);
      const matchMeta =
        turn.llm_model.toLowerCase().includes(q) ||
        turn.channel.toLowerCase().includes(q) ||
        turn.user_id.toLowerCase().includes(q);
      return matchMsg || matchTools || matchLLM || matchMeta;
    });
  }, [trace, searchQuery]);

  // If not admin, restrict view
  if (user && !user.is_admin) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
          Доступ запрещен (Требуются права Администратора)
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mb-6 leading-relaxed">
          Технические трейсы вызовов LLM, параметров инструментов и полного контекста
          доступны только системным администраторам платформы ALTAI Optima.
        </p>
        <Link
          href="/chats"
          className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-semibold hover:bg-amber-400 transition-colors"
        >
          Вернуться в диалоги
        </Link>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: Specific Chat Session Technical Trace Inspector
  // =========================================================================
  if (selectedSessionId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header & Navigation */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/chats"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Живые диалоги (/chats)</span>
                </Link>
                <span className="text-zinc-300 dark:text-zinc-700">/</span>
                <Link
                  href="/admin/chats"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span>Все трейсы</span>
                </Link>
                <span className="text-zinc-300 dark:text-zinc-700">/</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Технические детали
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-amber-500" />
                  <span>Трейс сессии:</span>
                  <span className="font-mono text-base sm:text-lg font-normal text-zinc-600 dark:text-zinc-300">
                    {selectedSessionId}
                  </span>
                </h1>
                <button
                  onClick={() => copyToClipboard(selectedSessionId, "session_id")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Копировать ID сессии"
                >
                  {copiedKey === "session_id" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {trace && (
                <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                  <span>
                    Компания:{" "}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {trace.tenant_business_name || trace.tenant_id}
                    </strong>{" "}
                    <span className="font-mono text-[11px] text-zinc-400">({trace.tenant_id})</span>
                  </span>
                  <span>•</span>
                  <span>
                    Клиент ID:{" "}
                    <strong className="font-mono text-zinc-800 dark:text-zinc-200">
                      {trace.user_id}
                    </strong>
                  </span>
                  <span>•</span>
                  <ChannelBadge channel={trace.channel} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {trace && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(trace, null, 2), "all_json")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-700"
                  title="Копировать полный JSON объект трейса в буфер обмена"
                >
                  {copiedKey === "all_json" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Копировать весь JSON</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => loadTrace(selectedSessionId)}
                disabled={loadingTrace}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Обновить данные трейса"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingTrace ? "animate-spin text-amber-500" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {traceError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{traceError}</span>
              </div>
              <button
                onClick={() => loadTrace(selectedSessionId)}
                className="underline font-semibold hover:text-red-800 dark:hover:text-red-300"
              >
                Повторить
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loadingTrace && !trace && (
            <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span>Загрузка технического трейса диалога...</span>
            </div>
          )}

          {/* Render Trace Details */}
          {trace && (
            <>
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <Layers className="h-3.5 w-3.5 text-blue-500" />
                    <span>Ходов диалога</span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {trace.turn_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <Cpu className="h-3.5 w-3.5 text-purple-500" />
                    <span>Всего токенов</span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {trace.total_prompt_tokens + trace.total_completion_tokens}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {trace.total_prompt_tokens} in / {trace.total_completion_tokens} out
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <Coins className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Стоимость LLM</span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {trace.total_cost_rub} ₽
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Сумм. задержка</span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {trace.turns.reduce((acc, t) => acc + (t.total_latency_ms || 0), 0)} ms
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                    <span>Вызовов tools</span>
                  </div>
                  <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    {trace.turns.reduce(
                      (acc, t) => acc + ((t.tools_executed as any[])?.length || 0),
                      0
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Финальный статус</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {trace.turns[trace.turns.length - 1]?.status || "unknown"}
                  </div>
                </div>
              </div>

              {/* Filter and Control Toolbar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs self-start">
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterMode === "all"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Все шаги ({trace.turns.length})
                  </button>
                  <button
                    onClick={() => setFilterMode("chat_only")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterMode === "chat_only"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Диалог (Клиент + Вера)
                  </button>
                  <button
                    onClick={() => setFilterMode("tech_only")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterMode === "tech_only"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Технические (LLM + Tools)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по диалогу, промптам, tools..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none w-56 sm:w-64"
                    />
                  </div>

                  <button
                    onClick={expandAll}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium flex items-center gap-1"
                    title="Развернуть все технические блоки"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Развернуть всё</span>
                  </button>

                  <button
                    onClick={collapseAll}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium flex items-center gap-1"
                    title="Свернуть все технические блоки"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Свернуть</span>
                  </button>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-6">
                {filteredTurns.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    По заданному фильтру реплики не найдены
                  </div>
                ) : (
                  filteredTurns.map((turn, tIdx) => {
                    const isTurnExpanded = expandedTurns[tIdx] ?? true;
                    const toolsList = (turn.tools_executed as AdminToolExecution[]) || [];
                    const llmStepsList = (turn.llm_steps as AdminLLMStep[]) || [];

                    return (
                      <div
                        key={turn.id || tIdx}
                        className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                      >
                        {/* Turn Header */}
                        <div
                          onClick={() => toggleTurn(tIdx)}
                          className="px-5 py-4 bg-zinc-50/80 dark:bg-zinc-950/70 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-zinc-100/70 dark:hover:bg-zinc-900/90 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              type="button"
                              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            >
                              {isTurnExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                              Ход #{tIdx + 1}
                            </span>
                            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                              ID: {turn.id}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {formatDateTime(turn.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            {turn.total_latency_ms && (
                              <span className="inline-flex items-center gap-1 text-zinc-500 font-mono">
                                <Clock className="h-3 w-3 text-amber-500" />
                                <span>{turn.total_latency_ms} ms</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-zinc-500 font-mono">
                              <Cpu className="h-3 w-3 text-purple-500" />
                              <span>{turn.prompt_tokens + turn.completion_tokens} tok</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              <span>{turn.estimated_cost_rub.toFixed(4)} ₽</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                turn.status === "success"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              }`}
                            >
                              {turn.status}
                            </span>
                          </div>
                        </div>

                        {/* Turn Expanded Content: Strictly Chronological */}
                        {isTurnExpanded && (
                          <div className="p-5 sm:p-6 space-y-5">
                            {/* 1. Client Message */}
                            {filterMode !== "tech_only" && turn.user_message && (
                              <div className="relative pl-6 border-l-2 border-blue-500/60 dark:border-blue-500/40 space-y-2">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                                      1. Сообщение клиента
                                    </span>
                                    <span className="text-[11px] font-mono text-zinc-400">
                                      ({turn.user_id} через {turn.channel})
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(turn.user_message || "", `user_msg_${tIdx}`)
                                    }
                                    className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                                    title="Копировать текст сообщения"
                                  >
                                    {copiedKey === `user_msg_${tIdx}` ? (
                                      <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                    <span>Копировать</span>
                                  </button>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed">
                                  {turn.user_message}
                                </div>
                              </div>
                            )}

                            {/* 2. LLM Request & Response Steps */}
                            {filterMode !== "chat_only" && (
                              <>
                                {llmStepsList.length > 0 ? (
                                  llmStepsList.map((step, sIdx) => {
                                    const stepKey = `${turn.id}_llm_${sIdx}`;
                                    const isStepExpanded = expandedSteps[stepKey] ?? false;
                                    const isPhase1 = step.step === "dialog_agent_phase1";
                                    const isPhase2 = step.step === "dialog_agent_phase2";
                                    const isQual = step.step === "qualification_extraction";

                                    let stepLabel = `Запрос к LLM (Шаг ${sIdx + 1})`;
                                    if (isPhase1)
                                      stepLabel = "2. Запрос к LLM (Фаза 1: Первичный анализ)";
                                    if (isPhase2)
                                      stepLabel =
                                        "5. Запрос к LLM (Фаза 2: Синтез ответа с учетом фактов)";
                                    if (isQual) stepLabel = "Квалификация BANT: LLM Запрос";

                                    return (
                                      <div
                                        key={sIdx}
                                        className="relative pl-6 border-l-2 border-purple-500/60 dark:border-purple-500/40 space-y-3"
                                      >
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                          <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                              <Sparkles className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                                              {stepLabel}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-mono text-[11px]">
                                              {step.model || turn.llm_model}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-3 text-xs">
                                            {step.ttft_ms && (
                                              <span className="font-mono text-zinc-400 text-[11px]">
                                                TTFT: {step.ttft_ms} ms
                                              </span>
                                            )}
                                            {step.prompt_tokens && (
                                              <span className="font-mono text-zinc-400 text-[11px]">
                                                {step.prompt_tokens} in / {step.completion_tokens} out
                                              </span>
                                            )}
                                            <button
                                              onClick={() => toggleStep(stepKey)}
                                              className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                            >
                                              {isStepExpanded ? (
                                                <>
                                                  <ChevronDown className="h-3 w-3" />
                                                  <span>Свернуть детали</span>
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronRight className="h-3 w-3" />
                                                  <span>Показать запрос и ответ</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {isStepExpanded ? (
                                          <div className="space-y-3 pt-1">
                                            {/* LLM Input / Request Messages */}
                                            {step.request_messages &&
                                              step.request_messages.length > 0 && (
                                                <div className="space-y-1.5">
                                                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                                                    <span>
                                                      Запрос, переданный в LLM (Промпт и контекст):
                                                    </span>
                                                    <button
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          JSON.stringify(
                                                            step.request_messages,
                                                            null,
                                                            2
                                                          ),
                                                          `prompt_${stepKey}`
                                                        )
                                                      }
                                                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1"
                                                    >
                                                      {copiedKey === `prompt_${stepKey}` ? (
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                      ) : (
                                                        <Copy className="h-3 w-3" />
                                                      )}
                                                      <span>Копировать промпт</span>
                                                    </button>
                                                  </div>

                                                  <div className="space-y-2 max-h-96 overflow-y-auto p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                                                    {step.request_messages.map((msg, mIdx) => (
                                                      <div
                                                        key={mIdx}
                                                        className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/50 dark:border-zinc-800/50 space-y-1"
                                                      >
                                                        <div className="flex items-center gap-2">
                                                          <span
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                              msg.role === "system"
                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                                : msg.role === "user"
                                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                            }`}
                                                          >
                                                            {msg.role}
                                                          </span>
                                                        </div>
                                                        <pre className="text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                          {msg.content}
                                                        </pre>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                            {/* LLM Output / Raw Response */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                                                <span>Сырой ответ модели (LLM Output):</span>
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(
                                                      step.response_content ||
                                                        step.content_preview ||
                                                        "",
                                                      `resp_${stepKey}`
                                                    )
                                                  }
                                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1"
                                                >
                                                  {copiedKey === `resp_${stepKey}` ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                  ) : (
                                                    <Copy className="h-3 w-3" />
                                                  )}
                                                  <span>Копировать ответ</span>
                                                </button>
                                              </div>

                                              <div className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                                {step.response_content ||
                                                  step.content_preview ||
                                                  "—"}
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="p-2.5 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-200/40 dark:border-purple-900/30 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 font-mono">
                                            {step.response_content || step.content_preview || "—"}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="relative pl-6 border-l-2 border-purple-500/60 dark:border-purple-500/40 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="h-4 w-4 text-purple-500" />
                                      <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                                        Запрос и ответ LLM ({turn.llm_model})
                                      </span>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 italic">
                                      Лог промежуточных фаз LLM не был зафиксирован для этой
                                      архивной записи.
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* 3. Used Tools */}
                            {filterMode !== "chat_only" && toolsList.length > 0 && (
                              <div className="relative pl-6 border-l-2 border-amber-500/70 dark:border-amber-500/50 space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Wrench className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                    4. Использованные инструменты ({toolsList.length})
                                  </span>
                                </div>

                                <div className="space-y-3">
                                  {toolsList.map((tExec, tIdx2) => {
                                    const toolKey = `${turn.id}_tool_${tIdx2}`;
                                    const isToolExpanded = expandedSteps[toolKey] ?? true;

                                    return (
                                      <div
                                        key={tIdx2}
                                        className="rounded-2xl border border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/15 overflow-hidden"
                                      >
                                        <div
                                          onClick={() => toggleStep(toolKey)}
                                          className="px-4 py-2.5 bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 flex items-center justify-between gap-2 cursor-pointer select-none"
                                        >
                                          <div className="flex items-center gap-2">
                                            {isToolExpanded ? (
                                              <ChevronDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                              <ChevronRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                            )}
                                            <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200">
                                              {tExec.tool || "unnamed_tool"}
                                            </span>
                                            {tExec.mode && (
                                              <span className="text-[10px] text-zinc-400 font-mono">
                                                [{tExec.mode}]
                                              </span>
                                            )}
                                          </div>

                                          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                                            {isToolExpanded ? "Скрыть" : "Показать параметры и ответ"}
                                          </span>
                                        </div>

                                        {isToolExpanded && (
                                          <div className="p-4 space-y-3 text-xs">
                                            {/* Arguments */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                                                <span>Входные параметры (Arguments):</span>
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(
                                                      JSON.stringify(tExec.arguments, null, 2),
                                                      `tool_args_${toolKey}`
                                                    )
                                                  }
                                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1 font-normal"
                                                >
                                                  {copiedKey === `tool_args_${toolKey}` ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                  ) : (
                                                    <Copy className="h-3 w-3" />
                                                  )}
                                                  <span>Копировать параметры</span>
                                                </button>
                                              </div>
                                              <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap">
                                                {JSON.stringify(tExec.arguments, null, 2)}
                                              </pre>
                                            </div>

                                            {/* Tool Output */}
                                            <div className="space-y-1.5">
                                              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                                                <span>Результат исполнения (Tool Output):</span>
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(
                                                      JSON.stringify(tExec.output, null, 2),
                                                      `tool_out_${toolKey}`
                                                    )
                                                  }
                                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1 font-normal"
                                                >
                                                  {copiedKey === `tool_out_${toolKey}` ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                  ) : (
                                                    <Copy className="h-3 w-3" />
                                                  )}
                                                  <span>Копировать результат</span>
                                                </button>
                                              </div>
                                              <pre className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap">
                                                {typeof tExec.output === "string"
                                                  ? tExec.output
                                                  : JSON.stringify(tExec.output, null, 2)}
                                              </pre>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 4. Vera's Customer-Facing Message */}
                            {filterMode !== "tech_only" && turn.assistant_response && (
                              <div className="relative pl-6 border-l-2 border-emerald-500/70 dark:border-emerald-500/50 space-y-2">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                      <Bot className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                      7. Сообщение Веры (Отправлено клиенту)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        turn.assistant_response || "",
                                        `vera_msg_${tIdx}`
                                      )
                                    }
                                    className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                                    title="Копировать ответ Веры"
                                  >
                                    {copiedKey === `vera_msg_${tIdx}` ? (
                                      <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                    <span>Копировать</span>
                                  </button>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                                  {turn.assistant_response}
                                </div>
                              </div>
                            )}

                            {/* Error if present */}
                            {turn.error_message && (
                              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>
                                    Ошибка в ходе #{tIdx + 1}: {turn.error_type || "Error"}
                                  </span>
                                </div>
                                <p className="font-mono text-[11px] leading-relaxed">
                                  {turn.error_message}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: All Chat Sessions Browser (when no specific session selected)
  // =========================================================================
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/chats"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Живые диалоги (/chats)</span>
              </Link>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Database className="h-3.5 w-3.5 text-amber-500" />
                <span>Консоль БД (/admin)</span>
              </Link>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-amber-500" />
              <span>Технические трейсы диалогов с LLM</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Хронологический аудит запросов к LLM, параметров кастомных инструментов и ответов
              Веры
            </p>
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadSessionsList();
              }}
              className="relative"
            >
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Поиск по ID сессии..."
                className="pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none w-56 sm:w-64"
              />
            </form>
            <button
              onClick={loadSessionsList}
              disabled={loadingList}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              title="Обновить список"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingList ? "animate-spin text-amber-500" : ""}`}
              />
            </button>
          </div>
        </div>

        {listError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs">
            {listError}
          </div>
        )}

        {/* Sessions List */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {loadingList && sessions.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span>Загрузка диалогов...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500">Диалоги не найдены</div>
          ) : (
            <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
              {sessions.map((sess) => (
                <Link
                  key={sess.session_id}
                  href={`/admin/chats/?session_id=${encodeURIComponent(sess.session_id)}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40 transition-colors group block"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {sess.session_id}
                      </span>
                      <ChannelBadge channel={sess.channel} />
                      <span className="text-[11px] font-semibold text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        {sess.tenant_id}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        User: {sess.user_id}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-2xl">
                      {sess.last_user_message ? (
                        <span>
                          <strong className="text-zinc-700 dark:text-zinc-300">Клиент:</strong>{" "}
                          {sess.last_user_message}
                        </span>
                      ) : sess.last_assistant_response ? (
                        <span>
                          <strong className="text-zinc-700 dark:text-zinc-300">Вера:</strong>{" "}
                          {sess.last_assistant_response}
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                    <div className="text-right">
                      <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1 justify-end">
                        <Layers className="h-3.5 w-3.5 text-amber-500" />
                        <span>{sess.turn_count} ходов</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {formatRelativeTime(sess.last_activity)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
