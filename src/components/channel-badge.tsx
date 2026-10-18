import React from "react";
import { MessageSquare, Phone, Globe, Send } from "lucide-react";

interface ChannelBadgeProps {
  channel: string;
  showIcon?: boolean;
}

export function ChannelBadge({ channel, showIcon = true }: ChannelBadgeProps) {
  const norm = channel.toLowerCase();

  if (norm.includes("telegram")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
        {showIcon && <Send className="h-3 w-3" />}
        <span>Telegram</span>
      </span>
    );
  }

  if (norm.includes("whatsapp")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        {showIcon && <Phone className="h-3 w-3" />}
        <span>WhatsApp</span>
      </span>
    );
  }

  if (norm.includes("instagram")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-amber-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30">
        {showIcon && (
          <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
          </svg>
        )}
        <span>Instagram</span>
      </span>
    );
  }

  if (norm.includes("web") || norm.includes("tilda")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
        {showIcon && <Globe className="h-3 w-3" />}
        <span>Сайт / Web</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
      {showIcon && <MessageSquare className="h-3 w-3" />}
      <span className="capitalize">{channel}</span>
    </span>
  );
}
