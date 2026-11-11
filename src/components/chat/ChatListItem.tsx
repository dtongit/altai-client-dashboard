"use client";

import React from "react";
import type { ChatSessionItem } from "@/types";
import { ChannelBadge } from "@/components/channel-badge";
import { formatRelativeTime } from "@/lib/utils";
import { Flame, PauseCircle } from "lucide-react";
import { AttentionChip } from "./AttentionChip";

export function formatClientTitle(channel?: string, userId?: string, clientName?: string | null) {
  if (clientName && clientName !== userId) return clientName;
  if (!userId) return "Клиент";
  let id = userId;
  if (id.includes("~")) id = id.split("~")[0];
  if ((channel || "").toLowerCase().includes("instagram")) {
    return id.startsWith("@") ? id : `@${id}`;
  }
  return id;
}

export function ChatListItem({
  chat,
  selected,
  onSelect,
}: {
  chat: ChatSessionItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const clientName = formatClientTitle(chat.channel, chat.user_id, chat.qualification?.client_name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 transition-all relative ${
        selected
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
          {chat.needs_attention ? (
            <AttentionChip escalatedAt={chat.escalated_at} reason={chat.escalation_reason} />
          ) : chat.is_paused ? (
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
}
