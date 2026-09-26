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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
        {showIcon && <Send className="h-3 w-3" />}
        <span>Telegram</span>
      </span>
    );
  }

  if (norm.includes("whatsapp")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        {showIcon && <Phone className="h-3 w-3" />}
        <span>WhatsApp</span>
      </span>
    );
  }

  if (norm.includes("web") || norm.includes("tilda")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
        {showIcon && <Globe className="h-3 w-3" />}
        <span>Сайт / Web</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
      {showIcon && <MessageSquare className="h-3 w-3" />}
      <span className="capitalize">{channel}</span>
    </span>
  );
}
