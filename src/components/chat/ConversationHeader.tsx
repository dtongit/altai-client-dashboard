"use client";

import React from "react";
import type { ChatDetail } from "@/types";
import { ChannelBadge } from "@/components/channel-badge";
import { formatClientTitle } from "./ChatListItem";
import { ArrowLeft, PauseCircle, PlayCircle, RotateCcw } from "lucide-react";

export function ConversationHeader({
  detail,
  onTogglePause,
  onReset,
  actionLoading,
  resetting,
  onBack,
}: {
  detail: ChatDetail;
  onTogglePause: () => void;
  onReset: () => void;
  actionLoading: boolean;
  resetting: boolean;
  onBack?: () => void;
}) {
  const clientTitle = formatClientTitle(detail.channel, detail.user_id, detail.qualification?.client_name);

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад к списку чатов"
            className="md:hidden p-1.5 -ml-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <ChannelBadge channel={detail.channel} />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>{clientTitle}</span>
            <span className="text-xs font-normal text-zinc-400 font-mono">
              ({detail.session_id})
            </span>
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            <span>Канал: {detail.channel}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  detail.is_paused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                }`}
              />
              {detail.is_paused ? "ИИ на паузе" : "ИИ активен"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePause}
          disabled={actionLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
            detail.is_paused
              ? "bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
              : "bg-amber-500 hover:bg-amber-600 text-zinc-950"
          } disabled:opacity-50`}
        >
          {detail.is_paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          <span>{detail.is_paused ? "Возобновить ИИ" : "Перехватить (пауза)"}</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
          title="Сбросить историю сообщений"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
          <span>Сбросить</span>
        </button>
      </div>
    </div>
  );
}
