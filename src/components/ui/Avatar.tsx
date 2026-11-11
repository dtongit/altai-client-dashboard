"use client";

import React from "react";
import { MessageSquare, Phone, Send } from "lucide-react";

export interface AvatarProps {
  name?: string | null;
  channel?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const cleaned = name.trim();
  if (!cleaned) return "?";

  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const second = parts[1][0];
    return (first + second).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function getColorIndex(name?: string | null): number {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const BG_COLORS = [
  "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
  "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
  "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800/60",
];

function ChannelCornerIcon({ channel }: { channel: string }) {
  const norm = channel.toLowerCase();

  if (norm.includes("telegram")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs ring-1 ring-white dark:ring-zinc-900">
        <Send className="h-2.5 w-2.5" />
      </span>
    );
  }

  if (norm.includes("whatsapp")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-1 ring-white dark:ring-zinc-900">
        <Phone className="h-2.5 w-2.5" />
      </span>
    );
  }

  if (norm.includes("instagram")) {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 text-white shadow-xs ring-1 ring-white dark:ring-zinc-900">
        <svg
          className="h-2.5 w-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </span>
    );
  }

  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-white shadow-xs ring-1 ring-white dark:ring-zinc-900">
      <MessageSquare className="h-2.5 w-2.5" />
    </span>
  );
}

export function Avatar({
  name,
  channel,
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = getInitials(name);
  const colorIndex = getColorIndex(name) % BG_COLORS.length;
  const colorCls = BG_COLORS[colorIndex];

  const sizeCls = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeCls} ${colorCls} flex items-center justify-center rounded-full font-bold select-none border`}
        aria-hidden="true"
      >
        {initials}
      </div>
      {channel && <ChannelCornerIcon channel={channel} />}
    </div>
  );
}
