"use client";

import React from "react";
import type { ChatMessage } from "@/types";
import { MessageWithMedia } from "./message-media";
import { Mic, AlertTriangle } from "lucide-react";
import { safeHttpUrl } from "@/lib/safe-url";

export interface MessageBubbleProps {
  message: ChatMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isAdmin?: boolean;
}

export function formatMessageTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  message,
  isFirstInGroup,
  isLastInGroup,
  isAdmin = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isOperator = message.role === "operator";

  // Check voice prefix
  const rawText = message.text || "";
  const isVoice = rawText.startsWith("[Голосовое сообщение]:");
  const cleanText = isVoice
    ? rawText.replace("[Голосовое сообщение]:", "").trim()
    : rawText;

  const isFailed = message.status === "failed";
  const timeStr = formatMessageTime(message.created_at);
  const latencyStr =
    isAdmin && message.latency_ms !== null && message.latency_ms !== undefined
      ? `${(message.latency_ms / 1000).toFixed(1)} с`
      : null;

  if (isUser) {
    return (
      <div className="flex flex-col items-start my-1 max-w-[85%] md:max-w-[70%]">
        {isVoice && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1 px-1">
            <Mic className="h-3 w-3" />
            <span>Голосовое</span>
          </div>
        )}
        <div className="rounded-2xl px-4 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200 dark:border-zinc-700/80 leading-relaxed break-words w-full">
          <MessageWithMedia text={cleanText} />
        </div>
        {isLastInGroup && timeStr && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1.5 select-none">
            {timeStr}
          </span>
        )}
      </div>
    );
  }

  // Right-aligned messages: Vera or Operator
  return (
    <div className="flex flex-col items-end my-1 self-end max-w-[85%] md:max-w-[70%]">
      {/* Operator name header */}
      {isOperator && isFirstInGroup && (
        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mb-1 px-1">
          {message.author || "Менеджер"}
        </span>
      )}

      <div className="flex items-end gap-2 w-full justify-end">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-2xs ${
            isOperator
              ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-zinc-900 dark:text-zinc-100"
              : isFailed
              ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200"
              : "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {cleanText && <MessageWithMedia text={cleanText} />}

          {/* Photos sent by operator */}
          {message.media && message.media.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.media.map((item, idx) => {
                const safe = safeHttpUrl(item.url);
                if (!safe) return null;
                return (
                  <a
                    key={idx}
                    href={safe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safe}
                      alt="Вложение"
                      className="h-20 w-20 object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Vera avatar for assistant message on last bubble of group */}
        {isAssistant && (
          <div className="w-6 shrink-0 flex items-center justify-center mb-1">
            {isLastInGroup && (
              <img
                src="/avatar_eva_face.webp"
                alt="Вера"
                className="h-6 w-6 rounded-full object-cover object-top border border-amber-500/40 shadow-2xs"
              />
            )}
          </div>
        )}
      </div>

      {/* Under bubble: failure text or timestamp / latency */}
      {isFailed && (
        <span className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1 px-1 font-medium">
          <AlertTriangle className="h-3 w-3" />
          <span>Не доставлено</span>
        </span>
      )}

      {isLastInGroup && !isFailed && (timeStr || latencyStr) && (
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1.5 select-none">
          {latencyStr && <span>{latencyStr}</span>}
          {timeStr && <span>{timeStr}</span>}
        </div>
      )}
    </div>
  );
}
