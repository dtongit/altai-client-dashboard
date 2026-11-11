"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ChatDetail } from "@/types";
import type { ChatSource } from "@/lib/chat-source";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ClientPanel } from "./ClientPanel";

export function Conversation({
  source,
  onResetSuccess,
  onBack,
}: {
  source: ChatSource;
  onResetSuccess?: () => void;
  onBack?: () => void;
}) {
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await source.getDetail();
      setDetail(res);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
  }, [fetchDetail]);

  const handleTogglePause = async () => {
    if (!detail) return;
    setActionLoading(true);
    try {
      if (detail.is_paused) {
        await source.resume(false);
      } else {
        await source.pause();
      }
      await fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!detail || !source.reset) return;
    const ok = window.confirm(`Сбросить историю диалога с клиентом ${detail.user_id}?`);
    if (!ok) return;
    setResetting(true);
    try {
      await source.reset();
      onResetSuccess?.();
    } finally {
      setResetting(false);
    }
  };

  const handleSend = async (text: string) => {
    await source.send(text, []);
    await fetchDetail();
  };

  if (loading && !detail) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-zinc-500">
        Загрузка диалога...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-zinc-500">
        Диалог не найден
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-100/40 dark:bg-zinc-900/30">
      <ConversationHeader
        detail={detail}
        onTogglePause={handleTogglePause}
        onReset={handleReset}
        actionLoading={actionLoading}
        resetting={resetting}
        onBack={onBack}
      />
      <ClientPanel detail={detail} />
      <MessageList turns={detail.turns || []} />
      <Composer disabled={actionLoading || resetting} onSend={handleSend} />
    </div>
  );
}
