"use client";

import React, { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

// Customer media reaches the dialog as text markers built by the Umnico webhook:
//   [Медиа-превью: <url>]  a picture (Instagram CDN, links expire)
//   [Ссылка: <url>]        a shared post / reel / story
const MARKER_RE = /\[(Медиа-превью|Ссылка):\s*([^\]\s]+)\s*\]/g;

type Segment =
  | { kind: "text"; text: string }
  | { kind: "media"; url: string }
  | { kind: "link"; url: string };

/** Only absolute https URLs are rendered as media or links; anything else stays plain text. */
function safeHttpsUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function splitMessage(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER_RE)) {
    const idx = m.index ?? 0;
    const url = safeHttpsUrl(m[2]);
    if (!url) continue; // leave the unsafe marker inside the surrounding text
    if (idx > last) out.push({ kind: "text", text: text.slice(last, idx) });
    out.push({ kind: m[1] === "Ссылка" ? "link" : "media", url });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

function MediaThumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] text-zinc-500 dark:text-zinc-400">
        <ImageOff className="h-3.5 w-3.5" />
        <span>медиа недоступно</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Вложение клиента"
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-56 max-w-full rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover"
      />
    </a>
  );
}

function LinkCard({ url }: { url: string }) {
  let host = url;
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname.length > 1 ? u.pathname : "";
  } catch {
    /* keep the raw url */
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      referrerPolicy="no-referrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50 transition-colors max-w-full"
    >
      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
      <span className="min-w-0 text-[11px] text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold">{host}</span>
        {path && <span className="block truncate text-zinc-500 dark:text-zinc-400">{path}</span>}
      </span>
    </a>
  );
}

/** Message text with customer-media markers turned into thumbnails and link cards. React escapes all text. */
export function MessageWithMedia({ text }: { text: string }) {
  const segments = splitMessage(text);
  if (!segments.some((s) => s.kind !== "text")) return <>{text}</>;
  return (
    <div className="space-y-2">
      {segments.map((s, i) => {
        if (s.kind === "text") {
          const t = s.text.trim();
          return t ? <div key={i}>{t}</div> : null;
        }
        return s.kind === "media" ? <MediaThumb key={i} url={s.url} /> : <LinkCard key={i} url={s.url} />;
      })}
    </div>
  );
}
