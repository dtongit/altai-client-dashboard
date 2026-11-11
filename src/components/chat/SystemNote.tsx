"use client";

import React from "react";
import { Info, PauseCircle, Clock, VolumeX } from "lucide-react";

const SYSTEM_STATUS_TEXTS: Record<string, { text: string; icon: typeof Info }> = {
  paused_takeover: {
    text: "Сообщение получено, Вера не отвечает: диалог у менеджера",
    icon: PauseCircle,
  },
  draft_outdated: {
    text: "Черновик Веры устарел и не был отправлен",
    icon: Clock,
  },
  no_reply: {
    text: "Вера решила не отвечать",
    icon: Info,
  },
  channel_off: {
    text: "Вера в этом канале выключена",
    icon: VolumeX,
  },
  comment_skipped: {
    text: "Комментарий без ответа",
    icon: Info,
  },
};

export function SystemNote({ status }: { status?: string }) {
  if (!status || !SYSTEM_STATUS_TEXTS[status]) return null;

  const { text, icon: Icon } = SYSTEM_STATUS_TEXTS[status];

  return (
    <div className="flex justify-center my-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs shadow-2xs border border-zinc-200/50 dark:border-zinc-700/50 max-w-[90%] text-center">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
}
