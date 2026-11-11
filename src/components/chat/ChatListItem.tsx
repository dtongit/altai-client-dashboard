"use client";

import React from "react";
import type { ChatSessionItem } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { AttentionChip } from "./AttentionChip";
import { Flame, PauseCircle, UserRound } from "lucide-react";

export function formatClientTitle(channel?: string, userId?: string, clientName?: string | null): string {
  if (clientName && clientName !== userId) return clientName;
  if (!userId) return "Клиент";
  let id = userId;
  if (id.includes("~")) id = id.split("~")[0];
  if ((channel || "").toLowerCase().includes("instagram")) {
    return id.startsWith("@") ? id : `@${id}`;
  }
  return id;
}

export function formatActivityTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) {
    return "вчера";
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export interface ChatListItemProps {
  chat: ChatSessionItem;
  selected: boolean;
  onSelect: () => void;
  currentUserId?: string | null;
}

export function ChatListItem({
  chat,
  selected,
  onSelect,
  currentUserId,
}: ChatListItemProps) {
  const displayName =
    chat.display_name ||
    formatClientTitle(chat.channel, chat.user_id, chat.qualification?.client_name);

  // Fallback for attention state if new field is not provided by backend yet
  const attention =
    chat.attention || (chat.needs_attention ? "escalated" : null);

  // Prefix last message if last_message_role is set
  let messagePrefix = "";
  if (chat.last_message_role === "vera") {
    messagePrefix = "Вера: ";
  } else if (chat.last_message_role === "manager") {
    const isMe = currentUserId && chat.owner?.user_id === currentUserId;
    messagePrefix = isMe ? "Вы: " : "Менеджер: ";
  }

  const rawLastMessage = chat.last_message || "";
  const displayLastMessage =
    messagePrefix && !rawLastMessage.startsWith(messagePrefix)
      ? `${messagePrefix}${rawLastMessage}`
      : rawLastMessage || "—";

  const hasLine3 =
    Boolean(attention) ||
    Boolean(chat.owner) ||
    Boolean(chat.is_qualified) ||
    (chat.is_paused && !attention);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full min-h-[72px] px-4 py-3 text-left transition-colors flex items-start gap-3 border-b border-zinc-100 dark:border-zinc-800/80 cursor-pointer select-none ${
        selected
          ? "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-l-amber-500"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40 border-l-4 border-l-transparent"
      }`}
    >
      {/* Left Avatar */}
      <Avatar name={displayName} channel={chat.channel} size="md" />

      {/* Middle content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Title & Activity Time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm truncate text-zinc-900 dark:text-white ${
              chat.unread ? "font-bold" : "font-semibold"
            }`}
          >
            {displayName}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
            {formatActivityTime(chat.last_activity)}
          </span>
        </div>

        {/* Line 2: Last message + unread dot */}
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              chat.unread
                ? "text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {displayLastMessage}
          </p>
          {chat.unread && (
            <span
              className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
              title="Непрочитанное сообщение"
            />
          )}
        </div>

        {/* Line 3: Chips */}
        {hasLine3 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {attention && (
              <AttentionChip
                attention={attention}
                waitingSince={chat.waiting_since}
                escalatedAt={chat.escalated_at}
                reason={chat.escalation_reason}
              />
            )}

            {chat.owner && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <UserRound className="h-3 w-3" />
                <span>{chat.owner.name}</span>
              </span>
            )}

            {chat.is_qualified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Flame className="h-3 w-3" />
                <span>Лид</span>
              </span>
            )}

            {chat.is_paused && !attention && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <PauseCircle className="h-3 w-3" />
                <span>На паузе</span>
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
