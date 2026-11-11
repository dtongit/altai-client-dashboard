"use client";

import React, { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { KbMediaItem } from "@/types";

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-base";
const btnCls =
  "rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50";

function Thumb({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      {broken ? (
        <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-[10px] text-amber-600 dark:text-amber-500">
          Фото не открывается
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}

export default function KbMediaEditor({
  value,
  onChange,
  showToast,
}: {
  value: KbMediaItem[];
  onChange: (items: KbMediaItem[]) => void;
  showToast: (type: "success" | "error", text: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState("");

  const update = (i: number, patch: Partial<KbMediaItem>) =>
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (fileRef.current) fileRef.current.value = "";
    let current = [...value];
    setUploading(true);
    try {
      for (const f of list) {
        if (current.length >= MAX_PHOTOS) {
          showToast("error", `Не больше ${MAX_PHOTOS} фото на узел`);
          break;
        }
        if (!ALLOWED.includes(f.type)) {
          showToast("error", `«${f.name}»: допустимы только JPG, PNG и WebP`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          showToast("error", `«${f.name}»: файл больше 10 МБ`);
          continue;
        }
        try {
          const item = await api.uploadKnowledgeMedia(f);
          current = [...current, item];
          onChange(current);
        } catch (e: any) {
          showToast("error", e?.message || `Не удалось загрузить «${f.name}»`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!url.startsWith("https://")) {
      showToast("error", "Ссылка должна начинаться с https://");
      return;
    }
    if (value.length >= MAX_PHOTOS) {
      showToast("error", `Не больше ${MAX_PHOTOS} фото на узел`);
      return;
    }
    onChange([...value, { url }]);
    setLink("");
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-500">
        Вера отправляет фото клиенту, только когда они помогают ответу. Подпись описывает, что на фото.
      </p>

      {value.map((m, i) => (
        <div
          key={`${m.id || m.url}-${i}`}
          className="flex gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5"
        >
          <Thumb url={m.url} />
          <div className="flex-1 min-w-0 space-y-2">
            <input
              type="text"
              maxLength={200}
              value={m.caption || ""}
              onChange={(e) => update(i, { caption: e.target.value })}
              placeholder="Подпись (видит Вера)"
              className={inputCls}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btnCls} aria-label="Выше">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                className={btnCls}
                aria-label="Ниже"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || value.length >= MAX_PHOTOS}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "Загрузить фото"}
        </button>
        <span className="text-[11px] text-zinc-500">
          {value.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Добавить по ссылке: https://…"
          className={inputCls}
        />
        <button type="button" onClick={addLink} className={`${btnCls} shrink-0`}>
          Добавить
        </button>
      </div>
    </div>
  );
}
