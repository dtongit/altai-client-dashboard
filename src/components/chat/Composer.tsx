"use client";

import React, { useState, useRef, useEffect } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { SendHorizontal, Paperclip, X } from "lucide-react";
import { useToast } from "@/lib/toast-context";

export interface ComposerProps {
  canSend?: boolean;
  replyWindowClosesAt?: string | null;
  sendMedia?: boolean;
  isPaused: boolean;
  onSend: (text: string, files: File[]) => Promise<void>;
  disabledReason?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

function getWindowRemaining(iso: string | null | undefined): { isClosed: boolean; isClosingSoon: boolean; label: string } | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - Date.now();
  if (diffMs <= 0) {
    return { isClosed: true, isClosingSoon: false, label: "0 мин" };
  }

  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const label = hours > 0 ? `${hours} ч ${min} мин` : `${min} мин`;

  // Closing soon if within 2 hours
  const isClosingSoon = diffMs <= 2 * 60 * 60 * 1000;

  return { isClosed: false, isClosingSoon, label };
}

export function Composer({
  canSend = true,
  replyWindowClosesAt,
  sendMedia = false,
  isPaused,
  onSend,
  disabledReason,
}: ComposerProps) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea up to 6 rows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [text]);

  const windowInfo = getWindowRemaining(replyWindowClosesAt);
  const isWindowClosed = windowInfo?.isClosed ?? false;
  const isInputDisabled = !canSend || isWindowClosed;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    if (files.length + selected.length > MAX_FILES) {
      showToast(`Можно прикрепить не более ${MAX_FILES} фото`, "error");
      return;
    }

    const validFiles: File[] = [];
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        showToast("Файл больше 10 МБ", "error");
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length > 0) {
      const nextFiles = [...files, ...validFiles];
      setFiles(nextFiles);

      // Generate object URLs for previews
      const newUrls = validFiles.map((f) => URL.createObjectURL(f));
      setFilePreviews((prev) => [...prev, ...newUrls]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const urlToRemove = filePreviews[index];
    if (urlToRemove) URL.revokeObjectURL(urlToRemove);

    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isInputDisabled || sending) return;
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;

    setSending(true);
    setErrorDetail(null);

    try {
      await onSend(trimmed, files);
      setText("");
      // Revoke and clear previews
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
      setFiles([]);
      setFilePreviews([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err: any) {
      const detail = err?.detail || err?.message || "Ошибка отправки сообщения";
      setErrorDetail(detail);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setErrorDetail(null);
    const hasFinePointer = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

    if (hasFinePointer) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg shrink-0">
      {/* Top hint or warning banner */}
      <div className="mb-2 min-h-[18px]">
        {isWindowClosed ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            Окно ответа закрыто: клиент писал больше 24 ч назад. Ответить можно, когда клиент напишет снова.
          </p>
        ) : !canSend && disabledReason ? (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {disabledReason}
          </p>
        ) : windowInfo?.isClosingSoon ? (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Окно ответа Instagram закроется через {windowInfo.label}
          </p>
        ) : !isPaused ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ваш ответ поставит Веру на паузу в этом чате
          </p>
        ) : null}
      </div>

      {/* File Previews */}
      {filePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {filePreviews.map((url, idx) => (
            <div key={idx} className="relative h-14 w-14 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Прикрепленное фото" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                aria-label="Удалить файл"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea + Buttons Container */}
      <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all">
        {sendMedia && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isInputDisabled || sending}
            />
            <IconButton
              type="button"
              aria-label="Прикрепить фото"
              variant="ghost"
              size="sm"
              disabled={isInputDisabled || sending}
              onClick={() => fileInputRef.current?.click()}
              className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
            >
              <Paperclip className="h-5 w-5" />
            </IconButton>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErrorDetail(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled || sending}
          placeholder={
            isInputDisabled
              ? "Отправка сообщений сейчас недоступна"
              : "Сообщение клиенту…"
          }
          rows={1}
          className="flex-1 max-h-36 resize-none bg-transparent py-1.5 px-2 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none disabled:opacity-60 leading-relaxed"
        />

        <IconButton
          type="button"
          aria-label="Отправить"
          variant="primary"
          size="sm"
          disabled={isInputDisabled || sending || (!text.trim() && files.length === 0)}
          loading={sending}
          onClick={handleSubmit}
        >
          <SendHorizontal className="h-4 w-4" />
        </IconButton>
      </div>

      {/* Error message under composer */}
      {errorDetail && (
        <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 px-1 font-medium">
          {errorDetail}
        </div>
      )}
    </div>
  );
}
