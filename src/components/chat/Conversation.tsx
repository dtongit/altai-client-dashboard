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
  livePolling = true,
}: {
  source: ChatSource;
  onResetSuccess?: () => void;
  onBack?: () => void;
  isAdmin?: boolean;
  isLinkPage?: boolean;
  className?: string;
  onAuthError?: () => void;
  /** True when the live stream is down (or unknown): the open chat is then polled every 10 s. */
  livePolling?: boolean;
}) {
  const { showToast } = useToast();
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopPanelVisible, setDesktopPanelVisible] = useState(true);
  const [isXl, setIsXl] = useState(false);
  // Draft rewrite in progress (H4): the draft we asked Vera to redo
  const [rewrite, setRewrite] = useState<{ approvalId: string; iteration: number } | null>(null);
  const onAuthErrorRef = useRef(onAuthError);
  onAuthErrorRef.current = onAuthError;
  const [crm, setCrm] = useState<ChatCrm | null>(null);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const lastCrmFetchRef = useRef<number>(0);

  // Any 401 on any link call means the link is gone: let the page show the expired screen.
  const handleAuthFailure = useCallback((err: any): boolean => {
    if (err?.status === 401) {
      onAuthErrorRef.current?.();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => {
      setIsXl(mq.matches);
      if (mq.matches) setSheetOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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
      } catch (err) {
        if (!handleAuthFailure(err)) setCrm(null);
      } finally {
        setLoadingCrm(false);
      }
    },
    [source, handleAuthFailure]
  );

  const fetchDetail = useCallback(async () => {
    try {
      const res = await source.getDetail();
      setDetail(res);
    } catch (err: any) {
      handleAuthFailure(err);
    } finally {
      setLoading(false);
    }
  }, [source, handleAuthFailure]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
    fetchCrm(false);
  }, [fetchDetail, fetchCrm]);

  // Mark read when the chat opens and when the last message changes (not on every refetch)
  const lastMessageKey = detail?.messages?.length
    ? `${detail.messages.length}:${detail.messages[detail.messages.length - 1].id}`
    : `t${detail?.turns?.length ?? 0}`;
  const hasDetail = Boolean(detail);
  useEffect(() => {
    if (!hasDetail) return;
    if (source.markRead && typeof document !== "undefined" && document.visibilityState === "visible") {
      source.markRead().catch(() => {});
    }
  }, [source, hasDetail, lastMessageKey]);

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

    // Brief 6.5: poll the open chat only while the live stream is down
    const timer = livePolling
      ? setInterval(() => {
          if (document.visibilityState === "visible") fetchDetail();
        }, 10000)
      : null;

    return () => {
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("chat-updated", handleChatUpdated);
      if (timer) clearInterval(timer);
    };
  }, [fetchDetail, source, fetchCrm, livePolling]);

  // H4: leave the "Vera is rewriting" state once a newer draft (or none) arrives
  useEffect(() => {
    if (!rewrite || !detail) return;
    const d = detail.draft;
    if (!d || d.approval_id !== rewrite.approvalId || (d.iteration ?? 0) > rewrite.iteration) {
      setRewrite(null);
    }
  }, [rewrite, detail]);

  // Light poll while waiting + 60 s time-out; timers die with the chat (component is keyed by chat)
  useEffect(() => {
    if (!rewrite) return;
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") fetchDetail();
    }, 3000);
    const timeout = setTimeout(() => {
      showToast("Вера пока не прислала новый вариант, обновите чат позже", "warning");
      setRewrite(null);
    }, 60000);
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [rewrite, fetchDetail, showToast]);

  const handleTakeChat = async () => {
    try {
      await source.take();
      await fetchDetail();
    } catch (err: any) {
      if (handleAuthFailure(err)) return;
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
      if (handleAuthFailure(err)) return;
      showToast(err?.detail || err?.message || "Не удалось возобновить диалог", "error");
    }
  };

  const handleReleaseChat = async () => {
    if (!source.release) return;
    try {
      await source.release();
      await fetchDetail();
    } catch (err: any) {
      if (handleAuthFailure(err)) return;
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
      if (handleAuthFailure(err)) return;
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
      if (handleAuthFailure(err)) return;
      if (err?.status === 404 || err?.status === 409) {
        showToast("Черновик уже обработан или устарел", "error");
      } else if (err?.reason === "provider_error") {
        showToast(err?.detail || "Сообщение не доставлено провайдером", "error");
      } else {
        const detailMsg = err?.detail || err?.message || "Черновик уже обработан или устарел";
        showToast(detailMsg, "error");
      }
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
      setRewrite({ approvalId: detail.draft.approval_id, iteration: detail.draft.iteration ?? 0 });
    } catch (err: any) {
      if (handleAuthFailure(err)) return;
      const detailMsg = err?.detail || err?.message || "Ошибка обновления черновика";
      showToast(detailMsg, "error");
      await fetchDetail();
    }
  };

  const handleSendOperatorMessage = async (text: string, files: File[]) => {
    try {
      const res = await source.send(text, files);
      if (res && res.warning) {
        showToast(res.warning, "warning");
      }
    } catch (err) {
      handleAuthFailure(err);
      throw err;
    }
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
            // Below xl the ⓘ opens the sheet; from xl up it collapses/expands the inline panel
            if (isXl) setDesktopPanelVisible((v) => !v);
            else setSheetOpen((v) => !v);
          }}
          isPanelOpen={isXl ? desktopPanelVisible : sheetOpen}
          onTake={handleTakeChat}
          onResume={handleResumeChat}
          onRelease={source.release ? handleReleaseChat : undefined}
          onReset={source.reset ? handleResetChat : undefined}
          isLinkPage={isLinkPage}
        />

        <MessageList
          messages={detail.messages}
          turns={detail.turns}
          isAdmin={isAdmin}
          draftKey={detail.draft ? `${detail.draft.approval_id}:${detail.draft.iteration ?? 0}` : ""}
          draftNode={
            detail.draft ? (
              <DraftBubble
                draft={detail.draft}
                onSend={handleSendDraft}
                onRegenerate={handleRegenerateDraft}
                isSending={isSendingDraft}
                isRewriting={Boolean(rewrite)}
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
          cannotSendReason={detail.cannot_send_reason}
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
        open={sheetOpen && !isXl}
        onClose={() => setSheetOpen(false)}
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
