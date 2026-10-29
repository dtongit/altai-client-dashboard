"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { TeamBotConversation, TeamBotLogEvent } from "@/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Users,
  MessageSquare,
  AlertTriangle,
  MousePointerClick,
  Terminal,
  ShieldAlert,
  Clock,
  Coins,
  ChevronDown,
  ChevronRight,
  Send,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export default function AdminTeamChatsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<TeamBotConversation[]>([]);
  const [selectedTgId, setSelectedTgId] = useState<string | null>(null);
  const [events, setEvents] = useState<TeamBotLogEvent[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  const loadConversations = async () => {
    setLoadingList(true);
    try {
      const res = await api.listTeamChats();
      const list = res.conversations || (res as any).chats || [];
      if (Array.isArray(list)) {
        const normalized: TeamBotConversation[] = list.map((c: any) => ({
          telegram_user_id: c.telegram_user_id,
          display_name: c.display_name || c.telegram_username || "Сотрудник",
          role: c.role,
          total_events: c.total_events ?? c.events_count ?? 0,
          last_event_time: c.last_event_time || c.last_created_at || "",
          last_event_type: c.last_event_type || "dialog",
          last_message: c.last_message || "",
        }));
        setConversations(normalized);
        if (!selectedTgId && normalized.length > 0) {
          setSelectedTgId(normalized[0].telegram_user_id);
        }
      }
    } catch (e) {
      console.error("Failed to load team bot conversations:", e);
    } finally {
      setLoadingList(false);
    }
  };

  const loadHistory = async (tgId: string) => {
    setLoadingEvents(true);
    try {
      const res = await api.getTeamChatHistory(tgId, 100);
      if (res.events) {
        setEvents(res.events);
      }
    } catch (e) {
      console.error("Failed to load team bot history for user:", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedTgId) {
      loadHistory(selectedTgId);
    }
  }, [selectedTgId]);

  const selectedConv = conversations.find((c) => c.telegram_user_id === selectedTgId);

  const filteredConversations = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.display_name.toLowerCase().includes(q) ||
      c.telegram_user_id.toLowerCase().includes(q) ||
      (c.last_message && c.last_message.toLowerCase().includes(q))
    );
  });

  const filteredEvents = events.filter((ev) => {
    if (typeFilter === "all") return true;
    return ev.event_type === typeFilter;
  });

  const togglePayload = (id: string) => {
    setExpandedPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "dialog":
        return {
          icon: <MessageSquare className="h-3 w-3" />,
          label: "Диалог",
          cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        };
      case "button_click":
        return {
          icon: <MousePointerClick className="h-3 w-3" />,
          label: "Клик по кнопке",
          cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
        };
      case "system_alert":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Системный алерт",
          cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
        };
      case "command":
        return {
          icon: <Terminal className="h-3 w-3" />,
          label: "Команда",
          cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        };
      case "guest_attempt":
        return {
          icon: <ShieldAlert className="h-3 w-3" />,
          label: "Гость",
          cls: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
        };
      default:
        return {
          icon: <Sliders className="h-3 w-3" />,
          label: type,
          cls: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
        };
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* Left Column: Conversations List */}
      <aside className="w-full lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Суперадмин БД</span>
            </Link>
            <button
              onClick={loadConversations}
              disabled={loadingList}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Обновить список"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white">Командные боты</h1>
              <p className="text-[11px] text-zinc-500">Архив событий `team_bot_logs`</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, Telegram ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* List of Team Members */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {loadingList ? (
            <div className="p-8 text-center text-xs text-zinc-400">Загрузка диалогов...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">Служебные диалоги не найдены</div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.telegram_user_id === selectedTgId;
              const badge = getEventBadge(c.last_event_type);
              return (
                <button
                  key={c.telegram_user_id}
                  onClick={() => setSelectedTgId(c.telegram_user_id)}
                  className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                      {c.display_name}
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                      {c.last_event_time ? formatRelativeTime(c.last_event_time) : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-zinc-500">ID: {c.telegram_user_id}</span>
                    {c.role && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {c.role}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] border ${badge.cls}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {c.last_message && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {c.last_message}
                    </p>
                  )}

                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Событий: <strong>{c.total_events}</strong>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Column: Latest-on-Top Event Stream */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedConv ? (
          <>
            {/* Top Toolbar */}
            <header className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20">
                  {selectedConv.display_name.slice(0, 1)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {selectedConv.display_name}
                  </h2>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    TG User ID: {selectedConv.telegram_user_id}
                  </div>
                </div>
              </div>

              {/* Event Type Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "Все события" },
                  { id: "dialog", label: "Диалоги" },
                  { id: "button_click", label: "Кнопки" },
                  { id: "system_alert", label: "Алерты" },
                  { id: "command", label: "Команды" },
                  { id: "guest_attempt", label: "Гости" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTypeFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      typeFilter === tab.id
                        ? "bg-indigo-600 text-white shadow-sm font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

                <button
                  onClick={() => loadHistory(selectedConv.telegram_user_id)}
                  disabled={loadingEvents}
                  className="p-1.5 ml-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Обновить события"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingEvents ? "animate-spin" : ""}`} />
                </button>
              </div>
            </header>

            {/* Event Timeline (Latest-on-Top) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {loadingEvents ? (
                <div className="p-12 text-center text-xs text-zinc-400">Загрузка хроники событий...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-400">
                  Событий по выбранному фильтру не найдено
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const badge = getEventBadge(ev.event_type);
                  const isPayloadOpen = Boolean(expandedPayloads[ev.id]);
                  return (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-sm space-y-3"
                    >
                      {/* Event Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>

                          <span className="text-[10px] text-zinc-400 font-mono">
                            {ev.direction === "outbound" ? "исходящее" : ev.direction === "inbound" ? "входящее" : ev.direction}
                          </span>

                          {ev.tenant_id && (
                            <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-mono">
                              tenant: {ev.tenant_id}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(ev.created_at)}</span>
                        </div>
                      </div>

                      {/* User Input / Action */}
                      {ev.user_message && (
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                            Входящий запрос
                          </div>
                          {ev.user_message}
                        </div>
                      )}

                      {/* Bot Response / Output */}
                      {ev.bot_response && (
                        <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                          <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ответ Веры / Системное уведомление</span>
                          </div>
                          {ev.bot_response}
                        </div>
                      )}

                      {/* Technical Telemetry Pills (Tokens, Cost, Model, Latency, Tools) */}
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                        {ev.llm_model && (
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Модель:</span>
                            <span className="font-mono">{ev.llm_model}</span>
                          </span>
                        )}

                        {ev.total_latency_ms !== null && ev.total_latency_ms !== undefined && ev.total_latency_ms > 0 && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{(ev.total_latency_ms / 1000).toFixed(2)} с</span>
                          </span>
                        )}

                        {(ev.prompt_tokens || ev.completion_tokens) ? (
                          <span className="flex items-center gap-1">
                            <span className="font-semibold">Токены:</span>
                            <span className="font-mono">
                              {ev.prompt_tokens ?? 0} ↑ / {ev.completion_tokens ?? 0} ↓
                            </span>
                          </span>
                        ) : null}

                        {ev.estimated_cost_rub !== null && ev.estimated_cost_rub !== undefined && ev.estimated_cost_rub > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Coins className="h-2.5 w-2.5" />
                            <span>{ev.estimated_cost_rub.toFixed(3)} ₽</span>
                          </span>
                        )}

                        {ev.tools_executed && Array.isArray(ev.tools_executed) && ev.tools_executed.length > 0 && (
                          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-mono">
                            <span>Инструменты:</span>
                            <span>{ev.tools_executed.join(", ")}</span>
                          </span>
                        )}

                        {/* Collapsible Event Payload Inspector */}
                        {ev.event_payload && Object.keys(ev.event_payload).length > 0 && (
                          <button
                            onClick={() => togglePayload(ev.id)}
                            className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-mono"
                          >
                            <span>Payload JSON</span>
                            {isPayloadOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded JSON Inspector */}
                      {isPayloadOpen && ev.event_payload && (
                        <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
                          {JSON.stringify(ev.event_payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <Users className="h-8 w-8 text-indigo-500/40 mb-2" />
            <p className="text-xs">Выберите сотрудника из списка слева для просмотра хроники событий</p>
          </div>
        )}
      </main>
    </div>
  );
}
