"use client";

import React, { useEffect, useState, useMemo } from "react";
import { extractChatLinkToken, createChatLinkSource } from "@/lib/chat-link-api";

export default function ChatLinkPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = extractChatLinkToken();
    setToken(t);
    setReady(true);
  }, []);

  const chatSource = useMemo(() => {
    return token ? createChatLinkSource(token) : null;
  }, [token]);

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500">Загрузка...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500">Ссылка больше не действует</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="text-sm text-zinc-500">Загрузка диалога...</div>
    </div>
  );
}
