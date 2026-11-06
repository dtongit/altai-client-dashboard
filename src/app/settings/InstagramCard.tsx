"use client";

import React from "react";
import type { ChannelItem, ChannelMode } from "@/types";
import ChannelModeToggle from "./ChannelModeToggle";
import { CARD_CLASS, InlineError, LineStatusNote } from "./ChannelCard";

interface Props {
  direct?: ChannelItem;
  comments?: ChannelItem;
  autoAllowed: boolean;
  savingIds: Record<string, boolean>;
  errors: Record<string, string | undefined>;
  onSelect: (id: string, mode: ChannelMode) => void;
}

export default function InstagramCard({ direct, comments, autoAllowed, savingIds, errors, onSelect }: Props) {
  const login = (direct?.identity || comments?.identity || "").replace(/^@/, "");
  const lineStatus = direct?.line_status ?? comments?.line_status ?? "unknown";

  const rows: { item: ChannelItem; title: string; hint: string }[] = [];
  if (direct) {
    rows.push({ item: direct, title: "Direct", hint: "Личные сообщения клиентов в Instagram" });
  }
  if (comments) {
    rows.push({
      item: comments,
      title: "Комментарии",
      hint: "Ответы на вопросы под вашими публикациями",
    });
  }

  return (
    <div className={`${CARD_CLASS} sm:col-span-2`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-500/20 via-rose-500/20 to-amber-500/20 text-pink-600 dark:text-pink-400 flex-shrink-0">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Instagram</h4>
          {login && <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">@{login}</p>}
        </div>
      </div>

      <LineStatusNote status={lineStatus} />

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows.map(({ item, title, hint }, i) => (
          <div
            key={item.id}
            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${i === 0 ? "pb-3" : "pt-3"}`}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">{title}</p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{hint}</p>
              <InlineError text={errors[item.id]} />
            </div>
            <ChannelModeToggle
              mode={item.mode}
              autoAllowed={autoAllowed}
              connected={item.connected}
              saving={Boolean(savingIds[item.id])}
              label={`Instagram: ${title}`}
              onSelect={(m) => onSelect(item.id, m)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
