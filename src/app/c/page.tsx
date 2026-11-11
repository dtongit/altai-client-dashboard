"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Conversation } from "@/components/chat/Conversation";
import { Button } from "@/components/ui/Button";
import { Link as LinkIcon } from "lucide-react";
import {
  extractChatLinkToken,
  clearStoredChatLinkToken,
  createChatLinkSource,
  CHAT_LINK_BASE_URL,
} from "@/lib/chat-link-api";
import { subscribeLiveEvents } from "@/lib/live-events";

export default function ChatLinkPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const t = extractChatLinkToken();
    if (!t) {
      setIsExpired(true);
    } else {
      setToken(t);
    }
    setReady(true);
  }, []);

  // Live events stream for chat-link
  useEffect(() => {
    if (!token) return;
    const unsub = subscribeLiveEvents({
      url: `${CHAT_LINK_BASE_URL}/events`,
      headers: () => ({ Authorization: `ChatLink ${token}` }),
      onChatUpdated: () => {
        window.dispatchEvent(new CustomEvent("chat-updated"));
      },
    });
    return () => unsub();
  }, [token]);

  const chatSource = useMemo(() => {
    return token ? createChatLinkSource(token) : null;
  }, [token]);

  if (!ready) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500">Загрузка...</div>
      </div>
    );
  }

  if (isExpired || !token || !chatSource) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center shadow-lg space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <LinkIcon className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
            Ссылка больше не действует
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Ссылки на чат действуют 7 дней. Откройте чат в кабинете.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Войти в кабинет
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Conversation
        key={token}
        source={chatSource}
        isLinkPage
        className="h-[100dvh]"
        onAuthError={() => {
          clearStoredChatLinkToken();
          setIsExpired(true);
        }}
      />
    </div>
  );
}
