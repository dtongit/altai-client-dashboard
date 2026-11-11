"use client";

import React, { useState } from "react";
import type { ChatDraft } from "@/types";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { safeHttpUrl } from "@/lib/safe-url";

export interface DraftBubbleProps {
  draft: ChatDraft;
  onSend: (scope?: "all" | "comment_only") => Promise<void>;
  onRegenerate: (note: string) => Promise<void>;
  isSending?: boolean;
}

export function DraftBubble({
  draft,
  onSend,
  onRegenerate,
  isSending = false,
}: DraftBubbleProps) {
  const [isExpandingNote, setIsExpandingNote] = useState(false);
  const [note, setNote] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSendDraft = async (scope?: "all" | "comment_only") => {
    await onSend(scope);
  };

  const handleSubmitRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isRegenerating) return;

    setIsRegenerating(true);
    try {
      await onRegenerate(note.trim());
      setIsExpandingNote(false);
      setNote("");
    } finally {
      setIsRegenerating(false);
    }
  };

  const hasPrivateMessage = Boolean(draft.private_message);

  return (
    <div className="flex flex-col items-end my-3 self-end max-w-[85%] md:max-w-[75%] w-full">
      <div className="w-full rounded-2xl border-2 border-dashed border-amber-400 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 shadow-sm flex flex-col gap-3">
        {/* Label header */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
          <Sparkles className="h-4 w-4" />
          <span>
            Черновик Веры — ждёт вашего решения
            {draft.iteration && draft.iteration > 1 ? ` · версия ${draft.iteration}` : ""}
          </span>
        </div>

        {/* Warning if any */}
        {draft.warning && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{draft.warning}</span>
          </div>
        )}

        {/* Draft text */}
        <div className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
          {draft.text}
        </div>

        {/* Draft Media Photos */}
        {draft.media && draft.media.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {draft.media.map((m, idx) => {
              const safe = safeHttpUrl(m.url);
              if (!safe) return null;
              return (
                <a
                  key={idx}
                  href={safe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl border border-amber-300 dark:border-amber-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safe}
                    alt="Черновик фото"
                    className="h-20 w-20 object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              );
            })}
          </div>
        )}

        {/* Private Direct Message for comment channels */}
        {hasPrivateMessage && (
          <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 space-y-1">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              И в Direct:
            </div>
            <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {draft.private_message}
            </div>
          </div>
        )}

        {/* Regenerating Spinner Indicator */}
        {isRegenerating && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 py-1">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Вера переписывает ответ…</span>
          </div>
        )}

        {/* Action Buttons */}
        {!isExpandingNote ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasPrivateMessage ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isSending}
                  onClick={() => handleSendDraft("all")}
                >
                  Отправить всё
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isSending}
                  onClick={() => handleSendDraft("comment_only")}
                >
                  Только комментарий
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={isSending}
                onClick={() => handleSendDraft()}
              >
                Отправить
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              disabled={isSending || isRegenerating}
              onClick={() => setIsExpandingNote(true)}
            >
              Переделать
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRegenerate} className="pt-2 space-y-2 w-full">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Что исправить? Например: предложи LORA и уточни размер"
              className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 p-2.5 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpandingNote(false);
                  setNote("");
                }}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isRegenerating}
                disabled={!note.trim()}
              >
                Отправить Вере
              </Button>
            </div>
          </form>
        )}

        {/* Bottom hint */}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Можно ответить клиенту самому — черновик тогда не отправится.
        </p>
      </div>
    </div>
  );
}
