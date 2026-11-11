"use client";

import React from "react";
import type { ChatSessionItem, ChatsCounts } from "@/types";
import { ChatListItem } from "./ChatListItem";
import { ChannelBadge } from "@/components/channel-badge";
import { Search, RefreshCw, MessageSquare } from "lucide-react";

export type ChatStatusTab = "all" | "attention" | "paused";

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
}: ChatListProps) {
  const tabs: Array<{ id: ChatStatusTab; label: string }> = [
    { id: "all", label: "Все" },
    { id: "attention", label: "Требуют внимания" },
    { id: "paused", label: "На паузе" },
  ];

  const channelEntries = Object.entries(counts?.by_channel || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-500" />
            <span>Чаты</span>
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Обновить список"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по сообщениям, имени, телефону..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 pl-9 pr-4 py-2 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </form>

        {/* Status tabs */}
        <div className="flex items-center gap-1 text-xs flex-wrap pt-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30 font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900 border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === "attention" && (counts?.attention ?? 0) > 0 && (
                <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-4">
                  {counts?.attention}
                </span>
              )}
              {tab.id === "paused" && (counts?.paused ?? 0) > 0 && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{counts?.paused}</span>
              )}
            </button>
          ))}
        </div>

        {/* Channel chips */}
        {(channelEntries.length > 1 || channelFilter) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onChannelFilterChange("")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition-colors cursor-pointer font-medium ${
                channelFilter === ""
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-400"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <span>Все</span>
              <span className="opacity-70">{counts?.all ?? 0}</span>
            </button>
            {channelEntries.map(([ch, n]) => (
              <button
                key={ch}
                type="button"
                onClick={() => onChannelFilterChange(channelFilter === ch ? "" : ch)}
                className={`inline-flex items-center gap-1 rounded-lg border px-1 py-0.5 text-[10px] transition-colors cursor-pointer ${
                  channelFilter === ch
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <ChannelBadge channel={ch} showIcon={false} />
                <span className="pr-1 font-medium">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
          chats.map((chat) => (
            <ChatListItem
              key={chat.session_id}
              chat={chat}
              selected={chat.session_id === selectedSessionId}
              onSelect={() => onSelectChat(chat.session_id)}
            />
          ))
        )}

        {hasMore && (
          <div className="p-3">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? "Загрузка..." : `Показать ещё (${Math.max(0, total - chats.length)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
