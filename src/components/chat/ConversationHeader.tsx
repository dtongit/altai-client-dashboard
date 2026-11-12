"use client";

import React, { useState } from "react";
import type { ChatDetail } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ChannelBadge } from "@/components/channel-badge";
import { ArrowLeft, Info, MoreVertical, RotateCcw, AlertCircle, Wrench, UserRound, ExternalLink, X } from "lucide-react";
import { formatClientTitle } from "./ChatListItem";
import { useAuth } from "@/lib/auth-context";

export interface ConversationHeaderProps {
  detail: ChatDetail;
  onBack?: () => void;
  onTogglePanel?: () => void;
  isPanelOpen?: boolean;
  onTake?: () => Promise<void>;
  onResume: (triggerReply: boolean) => Promise<void>;
  onRelease?: () => Promise<void>;
  onReset?: () => Promise<void>;
  isLinkPage?: boolean;
}

function formatExpiresAt(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const timePart = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

export function ConversationHeader({
  detail,
  onBack,
  onTogglePanel,
  isPanelOpen = false,
  onTake,
  onResume,
  onRelease,
  onReset,
  isLinkPage = false,
}: ConversationHeaderProps) {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loadingAction, setLoadingAction] = useState(false);
  const [dismissExpires, setDismissExpires] = useState(false);

  const displayName =
    detail.display_name ||
    formatClientTitle(detail.channel, detail.user_id, detail.client?.name || detail.qualification?.client_name);

  const phone = detail.client?.phone || detail.qualification?.client_phone;
  const isPaused = detail.is_paused;
  const isMeOwner = Boolean(user && detail.owner?.user_id && detail.owner.user_id === user.id);
  const canReset = detail.permissions?.can_reset ?? user?.is_admin ?? false;

  const handleTake = async () => {
    if (!onTake) return;
    setLoadingAction(true);
    try {
      await onTake();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResume = async (triggerReply: boolean) => {
    setLoadingAction(true);
    try {
      await onResume(triggerReply);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRelease = async () => {
    if (!onRelease) return;
    setLoadingAction(true);
    try {
      await onRelease();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReset = async () => {
    if (!onReset) return;
    const ok = await confirm({
      title: "Сбросить историю диалога?",
      text: "Вера забудет этот диалог, пауза будет снята. Сообщения в канале у клиента останутся.",
      confirmLabel: "Сбросить",
      cancelLabel: "Отмена",
      danger: true,
    });
    if (!ok) return;

    setLoadingAction(true);
    try {
      await onReset();
    } finally {
      setLoadingAction(false);
    }
  };

  const menuItems: MenuItem[] = isLinkPage
    ? [
        ...(isPaused
          ? [
              {
                label: "Вернуть и ответить сразу",
                icon: <RotateCcw className="h-4 w-4" />,
                onClick: () => handleResume(true),
              },
            ]
          : []),
        {
          label: "Открыть в кабинете",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: () => {
            window.location.href = `/chats/?session=${encodeURIComponent(detail.session_id)}`;
          },
        },
      ]
    : [
        ...(isPaused
          ? [
              {
                label: "Вернуть и ответить сразу",
                icon: <RotateCcw className="h-4 w-4" />,
                onClick: () => handleResume(true),
              },
            ]
          : []),
        ...(isMeOwner && onRelease
          ? [
              {
                label: "Отпустить чат",
                icon: <UserRound className="h-4 w-4" />,
                onClick: handleRelease,
              },
            ]
          : []),
        ...(user?.is_admin
          ? [
              {
                label: "Технические детали",
                icon: <Wrench className="h-4 w-4" />,
                onClick: () => {
                  window.open(`/admin/chats/?session_id=${encodeURIComponent(detail.session_id)}`, "_blank");
                },
              },
            ]
          : []),
        ...(canReset && onReset
          ? [
              {
                label: "Сбросить историю",
                icon: <RotateCcw className="h-4 w-4" />,
                onClick: handleReset,
                danger: true,
              },
            ]
          : []),
      ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shrink-0">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button (phone only) */}
          {onBack && (
            <IconButton
              type="button"
              aria-label="Назад к списку чатов"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden text-zinc-600 dark:text-zinc-400 -ml-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          )}

          <Avatar name={displayName} channel={detail.channel} size="md" />

          <div className="min-w-0">
            {isLinkPage && (detail as any).business_name && (
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate leading-tight mb-0.5">
                {(detail as any).business_name}
              </span>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                {displayName}
              </h2>
              {/* Phone link on desktop */}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="hidden md:inline-block text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-normal"
                >
                  {phone}
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <ChannelBadge channel={detail.channel} />

              {/* Owner chip if present */}
              {detail.owner && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <UserRound className="h-3 w-3" />
                  <span>Ведёт: {detail.owner.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isLinkPage && (
            /* Status pill (desktop) */
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  isPaused
                    ? "bg-amber-500"
                    : "bg-emerald-500 animate-pulse"
                }`}
              />
              <span>
                {detail.owner
                  ? `Ведёт: ${detail.owner.name}`
                  : isPaused
                  ? "Вера на паузе"
                  : "Вера отвечает"}
              </span>
            </div>
          )}

          {/* Primary Take / Return action button (also on the link page) */}
          {!isPaused ? (
            onTake && (
              <Button
                variant="primary"
                size="sm"
                loading={loadingAction}
                onClick={handleTake}
                className="text-xs font-semibold"
              >
                Взять себе
              </Button>
            )
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={loadingAction}
              onClick={() => handleResume(false)}
              className="text-xs font-semibold"
            >
              Вернуть Вере
            </Button>
          )}

          {/* Toggle Client Panel Button (ⓘ) */}
          {onTogglePanel && (
            <IconButton
              type="button"
              aria-label="Информация о клиенте"
              variant={isPanelOpen ? "primary" : "ghost"}
              size="sm"
              onClick={onTogglePanel}
              className={isPanelOpen ? "" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}
            >
              <Info className="h-5 w-5" />
            </IconButton>
          )}

          {/* ⋯ Menu */}
          {menuItems.length > 0 && (
            <Menu items={menuItems} align="right" />
          )}
        </div>
      </div>

      {/* Dismissible Link Expiration Banner */}
      {isLinkPage && (detail as any).expires_at && !dismissExpires && (
        <div className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Ссылка действует до {formatExpiresAt((detail as any).expires_at)}</span>
          <button
            type="button"
            onClick={() => setDismissExpires(true)}
            className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Закрыть уведомление"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Slim Rose Alert Bar if attention is escalated */}
      {detail.attention === "escalated" && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="truncate">
            Вера передала диалог{detail.escalation_reason ? `: ${detail.escalation_reason}` : ""}
          </span>
        </div>
      )}

      {/* Confirm Dialog Instance */}
      <ConfirmDialog />
    </div>
  );
}
