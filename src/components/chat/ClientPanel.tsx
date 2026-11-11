"use client";

import React, { useState } from "react";
import type { ChatDetail, ChatCrm } from "@/types";
import { ChannelBadge } from "@/components/channel-badge";
import { BANTCard } from "@/components/bant-card";
import { Copy, Check } from "lucide-react";
import { formatClientTitle } from "./ChatListItem";
import { useToast } from "@/lib/toast-context";

export interface ClientPanelProps {
  detail: ChatDetail;
  crm?: ChatCrm | null;
  loadingCrm?: boolean;
  onRefreshCrm?: () => Promise<void>;
  openChatHref?: (sessionId: string) => string;
}

export function ClientPanel({
  detail,
}: ClientPanelProps) {
  const { showToast } = useToast();
  const [copiedPhone, setCopiedPhone] = useState(false);

  const clientName =
    detail.client?.name ||
    detail.qualification?.client_name ||
    formatClientTitle(detail.channel, detail.user_id);

  const phone = detail.client?.phone || detail.qualification?.client_phone;
  const login = detail.client?.login;

  const handleCopyPhone = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    showToast("Номер телефона скопирован", "success");
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Клиент */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Клиент
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-zinc-900 dark:text-white truncate">
              {clientName}
            </span>
            <ChannelBadge channel={detail.channel} />
          </div>

          {phone && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Телефон:</span>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${phone}`}
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:text-amber-500 transition-colors"
                >
                  {phone}
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  aria-label="Скопировать телефон"
                >
                  {copiedPhone ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {login && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Логин:</span>
              <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {login.startsWith("@") ? login : `@${login}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Карточка Веры */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Карточка Веры
        </div>
        <div className="w-full">
          <BANTCard
            qualification={detail.qualification}
            crmResult={detail.crm_result}
          />
        </div>
      </div>
    </div>
  );
}
