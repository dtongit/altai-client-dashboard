"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export function waitLabel(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  if (min < 1440) return `${Math.floor(min / 60)} ч`;
  return `${Math.floor(min / 1440)} дн`;
}

export function AttentionChip({
  escalatedAt,
  reason,
}: {
  escalatedAt?: string | null;
  reason?: string | null;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px]"
      title={reason ? `Причина: ${reason}` : "Вера передала диалог менеджеру"}
    >
      <AlertCircle className="h-3 w-3" />
      <span>Ждёт ответа · {waitLabel(escalatedAt)}</span>
    </span>
  );
}
