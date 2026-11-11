"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import type { ChatMessage, ChatTurn } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { SystemNote } from "./SystemNote";
import { ArrowDown } from "lucide-react";

export interface MessageListProps {
  messages?: ChatMessage[];
  turns?: ChatTurn[];
  isAdmin?: boolean;
  draftNode?: React.ReactNode;
}

function formatDateSeparator(iso?: string | null): string {
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

  if (isToday) return "Сегодня";
  if (isYesterday) return "Вчера";

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  });
}

function turnsToMessages(turns?: ChatTurn[]): ChatMessage[] {
  if (!turns || turns.length === 0) return [];
  const result: ChatMessage[] = [];

  for (const t of turns) {
    if (t.user_message) {
      result.push({
        id: `${t.id || t.turn_index}_u`,
        role: "user",
        text: t.user_message,
        created_at: t.created_at,
        status: t.status,
      });
    }

    const isSystemStatus = [
      "paused_takeover",
      "draft_outdated",
      "no_reply",
      "channel_off",
      "comment_skipped",
    ].includes(t.status);

    if (isSystemStatus) {
      result.push({
        id: `${t.id || t.turn_index}_sys`,
        role: "assistant",
        text: null,
        created_at: t.created_at,
        status: t.status,
      });
    } else if (t.assistant_response) {
      result.push({
        id: `${t.id || t.turn_index}_a`,
        role: t.role === "operator" ? "operator" : "assistant",
        text: t.assistant_response,
        created_at: t.created_at,
        latency_ms: t.latency_ms,
        status: t.status,
      });
    }
  }

  return result;
}

export function MessageList({
  messages,
  turns,
  isAdmin = false,
  draftNode,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const isFirstRender = useRef(true);

  // Derive resolved message items (either from messages or fallback from turns)
  const resolvedMessages = useMemo(() => {
    if (messages && messages.length > 0) return messages;
    return turnsToMessages(turns);
  }, [messages, turns]);

  // Handle scroll detection and auto-scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isFirstRender.current) {
      // Open at the bottom
      el.scrollTop = el.scrollHeight;
      isFirstRender.current = false;
      return;
    }

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom <= 120) {
      el.scrollTop = el.scrollHeight;
      setShowScrollBottomPill(false);
    } else {
      setShowScrollBottomPill(true);
    }
  }, [resolvedMessages.length, draftNode]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom <= 60) {
      setShowScrollBottomPill(false);
    }
  };

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setShowScrollBottomPill(false);
    }
  };

  if (resolvedMessages.length === 0 && !draftNode) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-8 text-center text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed"
      >
        <div className="max-w-md">
          История диалога пуста. Вера начнёт заново со следующего сообщения клиента.
        </div>
      </div>
    );
  }

  // Group messages with date separators and bubble grouping
  let lastDateStr = "";

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 flex flex-col gap-1"
      >
        {resolvedMessages.map((msg, index) => {
          const currentDateStr = formatDateSeparator(msg.created_at);
          const showDateSeparator = currentDateStr && currentDateStr !== lastDateStr;
          if (showDateSeparator) {
            lastDateStr = currentDateStr;
          }

          // Check system note
          const isSystemStatus = [
            "paused_takeover",
            "draft_outdated",
            "no_reply",
            "channel_off",
            "comment_skipped",
          ].includes(msg.status || "");

          // Bubble grouping: check prev and next message roles
          const prevMsg = resolvedMessages[index - 1];
          const nextMsg = resolvedMessages[index + 1];

          const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role;
          const isLastInGroup = !nextMsg || nextMsg.role !== msg.role;

          return (
            <React.Fragment key={msg.id || index}>
              {showDateSeparator && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shadow-2xs select-none">
                    {currentDateStr}
                  </span>
                </div>
              )}

              {isSystemStatus ? (
                <SystemNote status={msg.status} />
              ) : (
                <MessageBubble
                  message={msg}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  isAdmin={isAdmin}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Draft Bubble if any */}
        {draftNode}
      </div>

      {/* Floating "Новые сообщения ↓" pill */}
      {showScrollBottomPill && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold shadow-lg hover:bg-amber-400 transition-all cursor-pointer animate-in fade-in"
        >
          <span>Новые сообщения</span>
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
