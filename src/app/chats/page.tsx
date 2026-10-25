"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ChatDetail, ChatSessionItem } from "@/types";
import { ChannelBadge } from "@/components/channel-badge";
import { BANTCard } from "@/components/bant-card";
import {
  Search,
  PauseCircle,
  PlayCircle,
  Clock,
  User,
  AlertCircle,
  Flame,
  MessageSquare,
  RefreshCw,
  Cpu,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

export default function ChatsPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatDetail, setChatDetail] = useState<ChatDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [operatorInput, setOperatorInput] = useState("");
  const [sendingOperatorMsg, setSendingOperatorMsg] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("");

  const loadChats = async () => {
    setLoadingList(true);
    try {
      const res = await api.getChats({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        channel: channelFilter || undefined,
      });
      if (res.ok) {
        const liveChats = (res.chats || []).filter((c) => {
          const ch = (c.channel || "").toLowerCase();
          const sess = (c.session_id || "").toLowerCase();
          return (
            ch !== "simulator" &&
            ch !== "web_simulator" &&
            ch !== "aitest" &&
            !sess.includes(":simulator:") &&
            !sess.includes(":aitest:") &&
            !sess.startsWith("simulator:") &&
            !sess.startsWith("aitest:")
          );
        });
        setChats(liveChats);
        if (!selectedSessionId && liveChats.length > 0) {
          setSelectedSessionId(liveChats[0].session_id);
        }
      }
    } catch (e) {
      console.error("Failed to load chats:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [statusFilter, channelFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadChats();
  };

  useEffect(() => {
    if (!selectedSessionId) return;

    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const res = await api.getChatDetail(selectedSessionId!);
        if (res.ok) {
          setChatDetail(res);
        }
      } catch (e) {
        console.error("Failed to load chat detail:", e);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedSessionId]);

  const handleTogglePause = async () => {
    if (!chatDetail) return;
    if (chatDetail.is_paused) {
      await handleResumeChat(false);
    } else {
      setActionLoading(true);
      try {
        const res = await api.pauseChat(
          chatDetail.session_id,
          "Ручной перехват оператором через дашборд"
        );
        if (res.ok) {
          setChatDetail({ ...chatDetail, is_paused: true });
          setChats((prev) =>
            prev.map((c) =>
              c.session_id === chatDetail.session_id ? { ...c, is_paused: true } : c
            )
          );
        }
      } catch (e) {
        console.error("Failed to pause chat:", e);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleResumeChat = async (triggerReply: boolean = false) => {
    if (!chatDetail) return;
    setActionLoading(true);
    try {
      const res = await api.resumeChat(chatDetail.session_id, triggerReply);
      if (res.ok) {
        setChatDetail({ ...chatDetail, is_paused: false });
        setChats((prev) =>
          prev.map((c) =>
            c.session_id === chatDetail.session_id ? { ...c, is_paused: false } : c
          )
        );
        if (triggerReply) {
          setTimeout(async () => {
            const fresh = await api.getChatDetail(chatDetail.session_id);
            if (fresh.ok) setChatDetail(fresh);
          }, 1500);
        }
      }
    } catch (e) {
      console.error("Failed to resume chat:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOperatorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDetail || !operatorInput.trim() || sendingOperatorMsg) return;
    setSendingOperatorMsg(true);
    const textToSend = operatorInput.trim();
    try {
      await api.sendChatMessage(chatDetail.session_id, textToSend);
      setOperatorInput("");
      const updated = await api.getChatDetail(chatDetail.session_id);
      if (updated.ok) {
        setChatDetail(updated);
        setChats((prev) =>
          prev.map((c) =>
            c.session_id === chatDetail.session_id
              ? { ...c, is_paused: true, last_message: `Менеджер: ${textToSend}` }
              : c
          )
        );
      }
    } catch (err: any) {
      alert(err?.detail || err?.message || "Ошибка отправки сообщения клиенту");
    } finally {
      setSendingOperatorMsg(false);
    }
  };

  const handleResetChat = async () => {
    if (!chatDetail) return;
    const confirmed = window.confirm(
      `Вы действительно хотите сбросить историю диалога с клиентом ${chatDetail.user_id} (${chatDetail.channel})?\n\n` +
      `Все предыдущие сообщения будут удалены из памяти ИИ, а сессия снята с паузы. При следующем сообщении из канала Вера начнет диалог с чистого листа.`
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await api.resetChat(chatDetail.session_id);
      if (res.ok) {
        setChatDetail({
          ...chatDetail,
          turns: [],
          turns_count: 0,
          is_paused: false,
          qualification: null,
          crm_result: null,
        });
        setChats((prev) =>
          prev.filter((c) => c.session_id !== chatDetail.session_id)
        );
      }
    } catch (e) {
      console.error("Failed to reset chat:", e);
      alert("Не удалось сбросить диалог. Проверьте соединение с сервером.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Left Column: Chat List */}
      <div className="w-full md:w-96 lg:w-[420px] flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950/70">
        {/* Search & Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <span>Диалоги клиентов</span>
            </h2>
            <button
              onClick={loadChats}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
              title="Обновить список"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по сообщениям, имени, телефону..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            />
          </form>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: "Все" },
              { id: "qualified", label: "🔥 Горячие лиды" },
              { id: "paused", label: "⏸️ На паузе" },
              { id: "active", label: "🟢 Активные" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Sessions */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900">
          {loadingList && chats.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Загрузка диалогов...
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Диалогов по выбранным фильтрам не найдено
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = chat.session_id === selectedSessionId;
              const clientName = chat.qualification?.client_name || chat.user_id;

              return (
                <button
                  key={chat.session_id}
                  onClick={() => setSelectedSessionId(chat.session_id)}
                  className={`w-full text-left p-4 transition-all relative ${
                    isSelected
                      ? "bg-amber-500/10 dark:bg-zinc-900/90 border-l-2 border-l-amber-500"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChannelBadge channel={chat.channel} showIcon={false} />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate max-w-[160px]">
                        {clientName}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                      {formatRelativeTime(chat.last_activity)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {chat.last_message || "—"}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {chat.is_paused ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <PauseCircle className="h-3 w-3" />
                          <span>На паузе</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                          <span>{chat.turn_count} ходов</span>
                        </span>
                      )}

                      {chat.is_qualified && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <Flame className="h-3 w-3" />
                          <span>Лид</span>
                        </span>
                      )}
                    </div>

                    {chat.crm_info && (
                      <span className="text-zinc-400 dark:text-zinc-500 truncate max-w-[120px]">
                        {chat.crm_info}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Inspector & Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/40 dark:bg-zinc-900/30">
        {!chatDetail ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-zinc-500">
            Выберите диалог из списка слева для просмотра деталей
          </div>
        ) : (
          <>
            {/* Chat Header & Takeover Controls */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ChannelBadge channel={chatDetail.channel} />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>
                      {chatDetail.qualification?.client_name || `Клиент ${chatDetail.user_id}`}
                    </span>
                    {chatDetail.qualification?.client_phone && (
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-normal">
                        ({chatDetail.qualification.client_phone})
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    ID: {chatDetail.session_id}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Admin Technical Details & Pause/Takeover */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {user?.is_admin && (
                  <Link
                    href={`/admin/chats/?session_id=${encodeURIComponent(chatDetail.session_id)}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-sm"
                    title="Открыть технические детали диалога в админке (LLM запросы, ответы, вызовы инструментов)"
                  >
                    <Cpu className="h-4 w-4 text-amber-500" />
                    <span>Технические детали</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Админ
                    </span>
                  </Link>
                )}

                <button
                  onClick={handleResetChat}
                  disabled={resetting || actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-sm"
                  title="Очистить историю диалога из памяти ИИ и снять с паузы (для чистого повторного тестирования)"
                >
                  <RotateCcw className={`h-4 w-4 text-rose-500 ${resetting ? "animate-spin" : ""}`} />
                  <span>Сбросить историю</span>
                </button>

                <button
                  onClick={handleTogglePause}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                    chatDetail.is_paused
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                      : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
                  }`}
                  title={
                    chatDetail.is_paused
                      ? "Возобновить автоответы ИИ в этом диалоге"
                      : "Остановить автоответы ИИ для ручного ответа оператора"
                  }
                >
                  {chatDetail.is_paused ? (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      <span>Возобновить работу ИИ</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-4 w-4" />
                      <span>Пауза ИИ / Перехват диалога</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Operator Takeover Alert Banner */}
            {chatDetail.is_paused && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <span>
                    <strong>Внимание: диалог перехвачен оператором.</strong> ИИ-продавец Вера временно не отвечает клиенту.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResumeChat(false)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 transition-colors whitespace-nowrap"
                  >
                    Снять с паузы
                  </button>
                  <button
                    onClick={() => handleResumeChat(true)}
                    disabled={actionLoading}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors whitespace-nowrap"
                    title="Снять диалог с паузы и сразу сгенерировать ответ клиенту силами Веры"
                  >
                    Снять и ответить ИИ
                  </button>
                </div>
              </div>
            )}

            {/* Split Content: Messages & BANT */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Messages Timeline & Operator Input */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatDetail.turns.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 space-y-3 text-zinc-400 dark:text-zinc-500">
                      <RotateCcw className="h-8 w-8 text-emerald-500/60" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          История диалога очищена
                        </p>
                        <p className="text-xs max-w-sm">
                          Память ИИ для этого диалога сброшена, сессия активна. При новом входящем сообщении из канала Вера начнет диалог с чистого листа.
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatDetail.turns.map((turn) => (
                    <div key={turn.id} className="space-y-3">
                      {/* User Message */}
                      {turn.user_message && (
                        <div className="flex items-start gap-3 max-w-xl">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-xs font-semibold shadow-sm">
                            {turn.user_message.startsWith("[Голосовое сообщение]:") ? (
                              <Mic className="h-4 w-4 text-indigo-500" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1">
                            {turn.user_message.startsWith("[Голосовое сообщение]:") && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 text-[10px] font-medium">
                                <Mic className="h-2.5 w-2.5" />
                                <span>Голосовое сообщение</span>
                              </div>
                            )}
                            <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed shadow-sm">
                              {turn.user_message.replace(/^\[Голосовое сообщение\]:\s*/, "")}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-1">
                              {formatDateTime(turn.created_at)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Assistant Response, Operator Message, or Paused / Pending Notification */}
                      {turn.status === "pending_approval" ? (
                        <div className="flex items-center justify-center py-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Ответ сформирован и ожидает одобрения супервизором в Telegram</span>
                          </span>
                        </div>
                      ) : turn.status === "paused_takeover" ? (
                        <div className="flex items-center justify-center py-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 text-[11px]">
                            <PauseCircle className="h-3 w-3" />
                            <span>Сообщение принято, автоответ ИИ остановлен ручной паузой</span>
                          </span>
                        </div>
                      ) : (turn.role === "operator" || turn.status === "operator_reply") ? (
                        <div className="flex items-start justify-end gap-3 max-w-xl ml-auto">
                          <div className="space-y-1 text-right">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-medium mb-1">
                              <span>Менеджер</span>
                            </div>
                            <div className="rounded-2xl rounded-tr-sm bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-4 py-3 text-xs text-zinc-900 dark:text-zinc-100 text-left leading-relaxed shadow-sm">
                              {turn.assistant_response}
                            </div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 pr-1">
                              {formatDateTime(turn.created_at)}
                            </div>
                          </div>
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-600/20">
                            М
                          </div>
                        </div>
                      ) : turn.assistant_response ? (
                        <div className="flex items-start justify-end gap-3 max-w-xl ml-auto">
                          <div className="space-y-1 text-right">
                            <div className="rounded-2xl rounded-tr-sm bg-amber-500/10 dark:bg-gradient-to-br dark:from-amber-500/10 dark:to-amber-600/10 border border-amber-500/20 px-4 py-3 text-xs text-zinc-900 dark:text-zinc-100 text-left leading-relaxed shadow-sm">
                              {turn.assistant_response}
                            </div>
                            <div className="flex items-center justify-end gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 pr-1">
                              {turn.latency_ms && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>{(turn.latency_ms / 1000).toFixed(1)} с</span>
                                </span>
                              )}
                              <span>{formatDateTime(turn.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-md shadow-amber-500/20">
                            В
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )))}
                </div>

                {/* Operator Manual Response Input Bar */}
                <form
                  onSubmit={handleSendOperatorMessage}
                  className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={operatorInput}
                    onChange={(e) => setOperatorInput(e.target.value)}
                    placeholder="Написать клиенту от имени менеджера (ставит ИИ на паузу)..."
                    disabled={sendingOperatorMsg}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!operatorInput.trim() || sendingOperatorMsg}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{sendingOperatorMsg ? "Отправка..." : "Ответить"}</span>
                  </button>
                </form>
              </div>

              {/* BANT Card Sidebar */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto bg-white/60 dark:bg-zinc-950/40">
                <BANTCard
                  qualification={chatDetail.qualification}
                  crmResult={chatDetail.crm_result}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
