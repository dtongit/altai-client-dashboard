"use client";

import React from "react";
import type { ChatSessionItem, ChatsCounts } from "@/types";
import { ChatListItem } from "./ChatListItem";
import { ChannelBadge } from "@/components/channel-badge";
import { Search, RefreshCw, X } from "lucide-react";

export type ChatStatusTab = "attention" | "mine" | "all" | "paused";

export interface ChatListProps {
  chats: ChatSessionItem[];
  selectedSessionId: string | null;
  onSelectChat: (sessionId: string) => void;
  statusFilter: ChatStatusTab;
  onStatusFilterChange: (status: ChatStatusTab) => void;
  channelFilter: string;
  onChannelFilterChange: (channel: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: ChatsCounts | null;
  total: number;
  hasMore: boolean;
  loadingList: boolean;
  loadingMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  currentUserId?: string | null;
  isPolling?: boolean;
}

export function ChatList({
  chats,
  selectedSessionId,
  onSelectChat,
  statusFilter,
  onStatusFilterChange,
  channelFilter,
  onChannelFilterChange,
  search,
  onSearchChange,
  counts,
  total,
  hasMore,
  loadingList,
  loadingMore,
  onRefresh,
  onLoadMore,
  currentUserId,
  isPolling = false,
}: ChatListProps) {
  // Only «Внимание» carries a number: it is the one that asks for action.
  const tabs: Array<{ id: ChatStatusTab; label: string; count?: number }> = [
    { id: "attention", label: "Внимание", count: counts?.attention },
    ...(typeof counts?.mine === "number" ? [{ id: "mine" as const, label: "Мои" }] : []),
    { id: "all", label: "Все" },
    { id: "paused", label: "Пауза" },
  ];

  const channelEntries = Object.entries(counts?.by_channel || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const showChannels = channelEntries.length > 1 || Boolean(channelFilter);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      {/* Top Header & Search */}
      <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Чаты
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            title="Обновить список"
            aria-label="Обновить список"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск"
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 pl-9 pr-8 py-2 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs: Segmented control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 w-full">
          {tabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none min-h-[36px] ${
                  active
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span className="min-w-[18px] px-1.5 rounded-full text-[10px] font-bold leading-[18px] text-center bg-rose-500 text-white">
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Polling fallback line on desktop */}
        {isPolling && (
          <div className="hidden md:block text-[11px] text-zinc-400 text-center pt-0.5">
            Обновление раз в 30 с
          </div>
        )}

        {/* Channel Chips (scrollable horizontal on phones, no wrap) */}
        {showChannels && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => onChannelFilterChange("")}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                channelFilter === ""
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30 font-semibold"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <span>Все каналы</span>
              <span className="text-[10px] opacity-70">{counts?.all ?? 0}</span>
            </button>
            {channelEntries.map(([ch, n]) => (
              <button
                key={ch}
                type="button"
                onClick={() => onChannelFilterChange(channelFilter === ch ? "" : ch)}
                className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  channelFilter === ch
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <ChannelBadge channel={ch} showIcon={false} />
                <span className="text-[10px] pr-0.5 font-semibold opacity-80">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loadingList && chats.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Загрузка диалогов...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
            {statusFilter === "attention"
              ? "Все чаты под контролем. Вера ведёт остальные диалоги."
              : "Диалогов по выбранным фильтрам нет"}
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.session_id}
              chat={chat}
              selected={chat.session_id === selectedSessionId}
              onSelect={() => onSelectChat(chat.session_id)}
              currentUserId={currentUserId}
            />
          ))
        )}

        {hasMore && (
          <div className="p-4">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? "Загрузка..." : `Показать ещё (${Math.max(0, total - chats.length)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
