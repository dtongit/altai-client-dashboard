"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ChatDetail, ChatCrm } from "@/types";
import type { ChatSource } from "@/lib/chat-source";
import { useToast } from "@/lib/toast-context";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { ClientPanel } from "./ClientPanel";
import { DraftBubble } from "./DraftBubble";
import { Sheet } from "@/components/ui/Sheet";

export function Conversation({
  source,
  onResetSuccess,
  onBack,
  isAdmin = false,
  isLinkPage = false,
  className = "",
  onAuthError,
}: {
  source: ChatSource;
  onResetSuccess?: () => void;
  onBack?: () => void;
  isAdmin?: boolean;
  isLinkPage?: boolean;
  className?: string;
  onAuthError?: () => void;
}) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [desktopPanelVisible, setDesktopPanelVisible] = useState(true);
  const [crm, setCrm] = useState<ChatCrm | null>(null);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const lastCrmFetchRef = useRef<number>(0);

  const fetchCrm = useCallback(
    async (force = false) => {
      if (!source.getCrm) return;
      if (!force && lastCrmFetchRef.current && Date.now() - lastCrmFetchRef.current < 5 * 60 * 1000) {
        return;
      }
      setLoadingCrm(true);
      try {
        const res = await source.getCrm(force);
        setCrm(res);
        lastCrmFetchRef.current = Date.now();
      } catch {
        setCrm(null);
      } finally {
        setLoadingCrm(false);
      }
    },
    [source]
  );

  const fetchDetail = useCallback(async () => {
    try {
      const res = await source.getDetail();
      setDetail(res);
    } catch (err: any) {
      if (err?.status === 401) {
        onAuthError?.();
      }
    } finally {
      setLoading(false);
    }
  }, [source, onAuthError]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
    fetchCrm(false);
  }, [fetchDetail, fetchCrm]);

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
      fetchCrm(false);
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

  const handleSendDraft = async (scope?: "all" | "comment_only") => {
    if (!detail?.draft) return;
    setIsSendingDraft(true);
    try {
      await source.sendDraft(detail.draft.approval_id, scope);
      showToast("Черновик отправлен", "success");
      await fetchDetail();
    } catch (err: any) {
      const detailMsg = err?.detail || err?.message || "Черновик уже обработан или устарел";
      showToast(detailMsg, "error");
      await fetchDetail();
    } finally {
      setIsSendingDraft(false);
    }
  };

  const handleRegenerateDraft = async (note: string) => {
    if (!detail?.draft) return;
    try {
      await source.regenerateDraft(detail.draft.approval_id, note);
      showToast("Запрос на переделку отправлен Вере", "success");
      setTimeout(fetchDetail, 2000);
      setTimeout(fetchDetail, 5000);
      setTimeout(fetchDetail, 10000);
    } catch (err: any) {
      const detailMsg = err?.detail || err?.message || "Ошибка обновления черновика";
      showToast(detailMsg, "error");
      await fetchDetail();
    }
  };

  const handleSendOperatorMessage = async (text: string, files: File[]) => {
    await source.send(text, files);
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
    <div className={`flex-1 flex overflow-hidden bg-zinc-100/40 dark:bg-zinc-900/30 ${className}`}>
      {/* Main Conversation Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-zinc-950">
        <ConversationHeader
          detail={detail}
          onBack={onBack}
          onTogglePanel={() => {
            setPanelOpen((v) => !v);
            setDesktopPanelVisible((v) => !v);
          }}
          isPanelOpen={panelOpen}
          onTake={isLinkPage ? undefined : handleTakeChat}
          onResume={handleResumeChat}
          onRelease={source.release ? handleReleaseChat : undefined}
          onReset={source.reset ? handleResetChat : undefined}
          isLinkPage={isLinkPage}
        />

        <MessageList
          messages={detail.messages}
          turns={detail.turns}
          isAdmin={isAdmin}
          draftNode={
            detail.draft ? (
              <DraftBubble
                draft={detail.draft}
                onSend={handleSendDraft}
                onRegenerate={handleRegenerateDraft}
                isSending={isSendingDraft}
              />
            ) : null
          }
        />

        <Composer
          canSend={detail.can_send ?? true}
          replyWindowClosesAt={detail.reply_window_closes_at}
          sendMedia={detail.capabilities?.send_media ?? false}
          isPaused={detail.is_paused}
          disabledReason={detail.disabled_reason}
          onSend={handleSendOperatorMessage}
        />
      </div>

      {/* Desktop Persistent Client Panel (visible at >= 1280px when not collapsed) */}
      {desktopPanelVisible && (
        <div className="hidden xl:block w-[340px] shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 overflow-y-auto">
          <ClientPanel
            detail={detail}
            crm={crm}
            loadingCrm={loadingCrm}
            onRefreshCrm={() => fetchCrm(true)}
            openChatHref={source.openChatHref}
          />
        </div>
      )}

      {/* Sheet Client Panel for < 1280px (bottom sheet on phones, right sheet on tablets/medium screens) */}
      <Sheet
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Информация о клиенте"
      >
        <ClientPanel
          detail={detail}
          crm={crm}
          loadingCrm={loadingCrm}
          onRefreshCrm={() => fetchCrm(true)}
          openChatHref={source.openChatHref}
        />
      </Sheet>
    </div>
  );
}
