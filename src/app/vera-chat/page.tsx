"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { safeHttpUrl } from "@/lib/safe-url";
import type { BossMessage } from "@/types";

const AVATAR = "/avatar_eva_face.webp";
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const SUGGESTIONS = [
  "Что сейчас требует внимания?",
  "Какие вопросы клиенты задавали сегодня?",
  "Добавь в базу знаний…",
];

function VeraAvatar({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AVATAR}
      alt="Вера"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-cover shrink-0 bg-zinc-200 dark:bg-zinc-800"
    />
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface Pending {
  id: string;
  file: File;
  url: string;
}

export default function VeraChatPage() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<BossMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState<{ text: string; photos: string[] } | null>(null);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<Pending[]>([]);
  filesRef.current = files;

  useEffect(() => {
    let cancelled = false;
    api
      .getBossChat()
      .then((r) => !cancelled && setMessages(r.messages || []))
      .catch((e) => {
        if (cancelled) return;
        if (e?.status === 403) setForbidden(e.detail || "Нет доступа к чату с Верой");
        else showToast(e?.detail || "Не удалось загрузить переписку", "error");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, optimistic, sending, loading]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
  }, [text]);

  const isTouch = useCallback(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    []
  );

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        showToast(`«${f.name}»: допустимы только JPG, PNG и WebP`, "error");
        continue;
      }
      if (f.size > MAX_BYTES) {
        showToast(`«${f.name}» больше 10 МБ`, "error");
        continue;
      }
      if (next.length >= MAX_FILES) {
        showToast("Можно прикрепить не более 5 фото", "error");
        break;
      }
      next.push({ id: `${f.name}-${f.size}-${Math.random()}`, file: f, url: URL.createObjectURL(f) });
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      prev.filter((f) => f.id === id).forEach((f) => URL.revokeObjectURL(f.url));
      return prev.filter((f) => f.id !== id);
    });
  };

  const send = async () => {
    const t = text.trim();
    if (sending || (!t && files.length === 0)) return;
    const sentFiles = files;
    setSending(true);
    setOptimistic({ text: t, photos: sentFiles.map((f) => f.url) });
    setText("");
    setFiles([]);
    try {
      const r = await api.sendBossMessage(t, sentFiles.map((f) => f.file));
      setMessages(r.messages || []);
      sentFiles.forEach((f) => URL.revokeObjectURL(f.url));
    } catch (e: any) {
      setText(t);
      setFiles(sentFiles);
      showToast(e?.detail || "Не удалось отправить сообщение", "error");
    } finally {
      setOptimistic(null);
      setSending(false);
    }
  };

  const press = async (messageId: string, data: string) => {
    if (busyMsg) return;
    setBusyMsg(messageId);
    try {
      const r = await api.pressBossButton(messageId, data);
      setMessages(r.messages || []);
      if (r.toast) showToast(r.toast, "success");
    } catch (e: any) {
      showToast(e?.detail || "Не удалось выполнить действие", "error");
    } finally {
      setBusyMsg(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) {
      e.preventDefault();
      send();
    }
  };

  const canSend = !sending && (text.trim().length > 0 || files.length > 0);
  const empty = useMemo(() => !loading && messages.length === 0 && !optimistic, [loading, messages, optimistic]);

  if (forbidden) {
    return (
      <div className="h-[calc(100dvh-var(--app-top)-var(--app-bottom))] flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-sm text-center">
          <div className="flex justify-center mb-3">
            <VeraAvatar size={56} />
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{forbidden}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--app-top)-var(--app-bottom))] flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <VeraAvatar size={40} />
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-white leading-tight">Вера</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            Ассистент команды: чаты, база знаний, изменения в работе Веры
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {loading && <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</p>}

          {empty && (
            <div className="pt-6">
              <div className="flex items-end gap-2">
                <VeraAvatar />
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800">
                  Здравствуйте! Я Вера. Спросите, что происходит в чатах, попросите поправить базу знаний или
                  инструкции — я подготовлю изменение, а вы подтвердите его кнопкой.
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 pl-9">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setText(s);
                      taRef.current?.focus();
                    }}
                    className="rounded-full border border-amber-500/40 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 px-3 py-1.5 text-sm transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageRow key={m.id} m={m} busy={busyMsg === m.id} onPress={press} />
          ))}

          {optimistic && (
            <MessageRow
              m={{
                id: "optimistic",
                role: "user",
                text: optimistic.text,
                photos: optimistic.photos,
                buttons: null,
                at: new Date().toISOString(),
              }}
              busy={false}
              onPress={() => {}}
              allowBlob
            />
          )}

          {sending && (
            <div className="flex items-end gap-2">
              <VeraAvatar />
              <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm bg-white text-zinc-500 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 animate-pulse">
                Вера печатает…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-3">
        <div className="mx-auto max-w-3xl">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {files.map((f) => (
                <div key={f.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.file.name}
                    className="h-16 w-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    disabled={sending}
                    aria-label="Убрать фото"
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 text-xs leading-none flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending || files.length >= MAX_FILES}
              aria-label="Прикрепить фото"
              title="Прикрепить фото"
              className="h-11 w-11 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l9.2-9.2a3.7 3.7 0 015.2 5.2l-9.2 9.2a1.8 1.8 0 01-2.6-2.6l8.5-8.5" />
              </svg>
            </button>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Напишите Вере…"
              className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder-zinc-400 px-3 py-2.5 text-base leading-6 max-h-[150px] focus:outline-none focus:ring-2 focus:ring-amber-500/60"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label="Отправить"
              className="h-11 px-4 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm disabled:opacity-40 disabled:hover:bg-amber-500"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  m,
  busy,
  onPress,
  allowBlob,
}: {
  m: BossMessage;
  busy: boolean;
  onPress: (id: string, data: string) => void;
  allowBlob?: boolean;
}) {
  const time = fmtTime(m.at);
  const photos = (m.photos || []).filter((u) => (allowBlob && u.startsWith("blob:")) || safeHttpUrl(u));

  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm bg-amber-100 text-zinc-900 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-50 dark:border-amber-500/30">
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {photos.map((u, i) => {
                const img = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u} alt="Фото" className="h-24 w-24 rounded-lg object-cover" />
                );
                const href = safeHttpUrl(u);
                return href ? (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  <span key={i}>{img}</span>
                );
              })}
            </div>
          )}
          {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
          {time && <div className="mt-1 text-[11px] text-right text-zinc-500 dark:text-amber-200/60">{time}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <VeraAvatar />
      <div className="max-w-[85%] min-w-0">
        {m.role === "diff" ? (
          <pre className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 p-3 text-xs font-mono leading-5">
            {m.text}
          </pre>
        ) : (
          <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800">
            <div className="whitespace-pre-wrap break-words">{m.text}</div>
            {time && <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{time}</div>}
          </div>
        )}
        {m.buttons && m.buttons.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {m.buttons.map((row, ri) => (
              <div key={ri} className="flex flex-wrap gap-1.5">
                {row.map((b, bi) => {
                  const cls =
                    "rounded-lg border border-amber-500/50 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";
                  const href = b.url ? safeHttpUrl(b.url) : null;
                  if (b.url) {
                    return href ? (
                      <a key={bi} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
                        {b.text}
                      </a>
                    ) : null;
                  }
                  return (
                    <button
                      key={bi}
                      type="button"
                      disabled={busy}
                      onClick={() => b.data && onPress(m.id, b.data)}
                      className={cls}
                    >
                      {b.text}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
