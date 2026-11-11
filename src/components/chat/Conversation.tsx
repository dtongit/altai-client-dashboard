"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ChatDetail } from "@/types";
import type { ChatSource } from "@/lib/chat-source";
import { useToast } from "@/lib/toast-context";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ClientPanel } from "./ClientPanel";

export function Conversation({
  source,
  onResetSuccess,
  onBack,
  isAdmin = false,
}: {
  source: ChatSource;
  onResetSuccess?: () => void;
  onBack?: () => void;
  isAdmin?: boolean;
}) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (source.markRead && typeof document !== "undefined" && document.visibilityState === "visible") {
      source.markRead().catch(() => {});
    }
  }, [source, detail]);

  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === "visible") {
        fetchDetail();
        if (source.markRead) source.markRead().catch(() => {});
      }
    };
    const handleChatUpdated = () => {
      fetchDetail();
    };
    document.addEventListener("visibilitychange", handleVis);
    window.addEventListener("chat-updated", handleChatUpdated);

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDetail();
      }
    }, 10000);

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("chat-updated", handleChatUpdated);
      clearInterval(timer);
    };
  }, [fetchDetail, source]);

  const handleTakeChat = async () => {
    try {
      await source.take();
      await fetchDetail();
    } catch (err: any) {
      showToast(err?.detail || err?.message || "Не удалось взять диалог", "error");
    }
  };

  const handleResumeChat = async (triggerReply: boolean) => {
    try {
      await source.resume(triggerReply);
      await fetchDetail();
      if (triggerReply) {
        setTimeout(fetchDetail, 2000);
        setTimeout(fetchDetail, 5000);
      }
    } catch (err: any) {
      showToast(err?.detail || err?.message || "Не удалось возобновить диалог", "error");
    }
  };

  const handleReleaseChat = async () => {
    if (!source.release) return;
    try {
      await source.release();
      await fetchDetail();
    } catch (err: any) {
      showToast(err?.detail || err?.message || "Не удалось отпустить диалог", "error");
    }
  };

  const handleResetChat = async () => {
    if (!source.reset) return;
    try {
      await source.reset();
      showToast("История диалога сброшена", "success");
      onResetSuccess?.();
    } catch (err: any) {
      showToast(err?.detail || err?.message || "Не удалось сбросить диалог", "error");
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
        onBack={onBack}
        onTake={handleTakeChat}
        onResume={handleResumeChat}
        onRelease={source.release ? handleReleaseChat : undefined}
        onReset={source.reset ? handleResetChat : undefined}
      />
      <ClientPanel detail={detail} />
      <MessageList messages={detail.messages} turns={detail.turns} isAdmin={isAdmin} />
      <Composer disabled={loading} onSend={handleSend} />
    </div>
  );
}
