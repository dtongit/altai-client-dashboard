"use client";

import React, { useRef, useEffect } from "react";
import type { ChatTurn } from "@/types";
import { MessageWithMedia } from "./message-media";
import { Mic, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export function MessageList({ turns }: { turns: ChatTurn[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [turns?.length]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {turns.map((turn, idx) => {
        const isOperator = turn.role === "operator";
        const isVoice = turn.user_message?.startsWith("[Голосовое сообщение]:");
        const cleanUserMsg = isVoice
          ? turn.user_message?.replace("[Голосовое сообщение]:", "").trim()
          : turn.user_message;

        return (
          <div key={turn.id || idx} className="space-y-3">
            {turn.user_message && (
              <div className="flex flex-col items-start max-w-[85%] md:max-w-[75%]">
                {isVoice && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1 px-1">
                    <Mic className="h-3 w-3" />
                    <span>Голосовое сообщение</span>
                  </div>
                )}
                <div className="rounded-2xl px-4 py-2.5 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200 dark:border-zinc-700/80 leading-relaxed break-words w-full">
                  <MessageWithMedia text={cleanUserMsg || ""} />
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1.5 select-none">
                  {formatDateTime(turn.created_at)}
                </span>
              </div>
            )}

            {turn.assistant_response && (
              <div className="flex flex-col items-end max-w-[85%] md:max-w-[75%] ml-auto">
                {isOperator && (
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mb-1 px-1">
                    Менеджер (ручной ответ)
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words shadow-2xs w-full ${
                    isOperator
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-zinc-900 dark:text-zinc-100"
                      : "bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <MessageWithMedia text={turn.assistant_response} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1.5 select-none">
                  {turn.latency_ms && <span>{(turn.latency_ms / 1000).toFixed(1)} с</span>}
                  <span>{formatDateTime(turn.created_at)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
