"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Clock, FileText } from "lucide-react";

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

export interface AttentionChipProps {
  attention?: "escalated" | "waiting" | "draft" | null;
  waitingSince?: string | null;
  escalatedAt?: string | null;
  reason?: string | null;
  className?: string;
}

export function AttentionChip({
  attention,
  waitingSince,
  escalatedAt,
  reason,
  className = "",
}: AttentionChipProps) {
  const [, setTick] = useState(0);

  // Re-render every 60s so wait label updates
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!attention) return null;

  const wait = waitLabel(waitingSince || escalatedAt);

  if (attention === "escalated") {
    return (
      <span
        title={reason ? `Причина: ${reason}` : "Вера передала диалог менеджеру"}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${className}`}
      >
        <AlertCircle className="h-3 w-3 shrink-0" />
        <span>Вера передала{wait ? ` · ${wait}` : ""}</span>
      </span>
    );
  }

  if (attention === "waiting") {
    return (
      <span
        title="Клиент ожидает ответа оператора"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 ${className}`}
      >
        <Clock className="h-3 w-3 shrink-0" />
        <span>Ждёт ответа{wait ? ` · ${wait}` : ""}</span>
      </span>
    );
  }

  if (attention === "draft") {
    return (
      <span
        title="Черновик ответа Веры ждёт проверки"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 ${className}`}
      >
        <FileText className="h-3 w-3 shrink-0" />
        <span>Черновик на проверке</span>
      </span>
    );
  }

  return null;
}
