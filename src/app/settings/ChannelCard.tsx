"use client";

import React from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import type { ChannelItem, ChannelMode } from "@/types";
import ChannelModeToggle from "./ChannelModeToggle";
import { channelLabel, formatIdentity, lineStatusMessage } from "./channel-meta";

export interface ChannelCardProps {
  channel: ChannelItem;
  autoAllowed: boolean;
  saving: boolean;
  error?: string | null;
  onSelect: (id: string, mode: ChannelMode) => void;
}

export function LineStatusNote({ status }: { status: string }) {
  const msg = lineStatusMessage(status);
  if (!msg) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
      <span>{msg}</span>
    </p>
  );
}

export function InlineError({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-400">
      {text}
    </p>
  );
}

export const CARD_CLASS =
  "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3";

/** Generic card: WhatsApp, Telegram Business, MAX and any future channel. */
export default function ChannelCard({ channel, autoAllowed, saving, error, onSelect }: ChannelCardProps) {
  const label = channelLabel(channel.id);
  const identity = formatIdentity(channel.id, channel.identity);

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{label}</h4>
          {identity && <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{identity}</p>}
        </div>
      </div>

      <ChannelModeToggle
        mode={channel.mode}
        autoAllowed={autoAllowed}
        connected={channel.connected}
        saving={saving}
        label={label}
        onSelect={(m) => onSelect(channel.id, m)}
      />
      <LineStatusNote status={channel.line_status} />
      <InlineError text={error} />
    </div>
  );
}
