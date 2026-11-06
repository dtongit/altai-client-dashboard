"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import type { ChannelMode } from "@/types";
import { AUTOPILOT_LOCKED_HINT } from "./channel-meta";

interface Props {
  mode: ChannelMode;
  autoAllowed: boolean;
  connected: boolean;
  saving: boolean;
  label: string;
  onSelect: (mode: ChannelMode) => void;
}

const BASE = "px-3 py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed";
const IDLE =
  "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium disabled:opacity-40 disabled:hover:text-zinc-600 dark:disabled:hover:text-zinc-400";

export default function ChannelModeToggle({ mode, autoAllowed, connected, saving, label, onSelect }: Props) {
  return (
    <div
      role="group"
      aria-label={`Режим канала: ${label}`}
      className={`inline-flex w-full sm:w-auto p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-inner ${
        saving ? "opacity-70" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect("off")}
        disabled={saving}
        aria-pressed={mode === "off"}
        className={`${BASE} flex-1 sm:flex-none ${mode === "off" ? "bg-rose-600 text-white shadow-sm font-semibold" : IDLE}`}
        title="Вера не отвечает в этом канале. Сообщения клиентов сохраняются в чатах, диалоги ведёт оператор."
      >
        <span>Выкл</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect("hitl")}
        disabled={saving || !connected}
        aria-pressed={mode === "hitl"}
        className={`${BASE} flex-1 sm:flex-none ${mode === "hitl" ? "bg-blue-600 text-white shadow-sm font-semibold" : IDLE}`}
        title={
          connected
            ? "Вера готовит черновик ответа, и он уходит клиенту только после вашего подтверждения."
            : "Канал не подключён"
        }
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Пре-модерация</span>
      </button>

      <button
        type="button"
        onClick={() => onSelect("auto")}
        disabled={saving || !connected || !autoAllowed}
        aria-pressed={mode === "auto"}
        className={`${BASE} flex-1 sm:flex-none ${mode === "auto" ? "bg-emerald-600 text-white shadow-sm font-semibold" : IDLE}`}
        title={
          !autoAllowed
            ? AUTOPILOT_LOCKED_HINT
            : connected
            ? "Вера отвечает клиентам сама, без подтверждения."
            : "Канал не подключён"
        }
      >
        <span>Автопилот</span>
      </button>
    </div>
  );
}
