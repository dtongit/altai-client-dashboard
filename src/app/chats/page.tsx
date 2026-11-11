"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import type { ChatSessionItem, ChatsCounts } from "@/types";
import { ChatList, ChatStatusTab } from "@/components/chat/ChatList";
import { Conversation } from "@/components/chat/Conversation";
import { createDashboardChatSource } from "@/lib/chat-source";

const PAGE_SIZE = 50;

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatSessionItem[]>([]);
  const [counts, setCounts] = useState<ChatsCounts | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChatStatusTab>("all");
  const [channelFilter, setChannelFilter] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  const requestSeq = useRef(0);
  const loadedCount = useRef(0);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedSessionId;

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);

    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      setSelectedSessionId(p.get("session"));
    };
    window.addEventListener("popstate", onPopState);

    const p = new URLSearchParams(window.location.search);
    const sid = p.get("session");
    if (sid) setSelectedSessionId(sid);
    const st = p.get("status") as ChatStatusTab;
    if (st && ["all", "attention", "paused", "mine"].includes(st)) setStatusFilter(st);
    setChannelFilter(p.get("channel") || "");
    setFiltersReady(true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const updateUrl = useCallback((sid: string | null, push = false) => {
    const p = new URLSearchParams();
    if (sid) p.set("session", sid);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (channelFilter) p.set("channel", channelFilter);
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (push) {
      window.history.pushState(null, "", url);
    } else {
      window.history.replaceState(null, "", url);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    if (!filtersReady) return;
    updateUrl(selectedSessionId, false);
  }, [filtersReady, statusFilter, channelFilter, updateUrl, selectedSessionId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadChats = useCallback(async (mode: "reset" | "more" | "silent" = "reset") => {
    const seq = ++requestSeq.current;
    if (mode === "reset") setLoadingList(true);
    if (mode === "more") setLoadingMore(true);

    try {
      const res = await api.getChats({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        channel: channelFilter || undefined,
        limit: mode === "silent" ? Math.min(200, Math.max(PAGE_SIZE, loadedCount.current)) : PAGE_SIZE,
        offset: mode === "more" ? loadedCount.current : 0,
      });

      if (seq !== requestSeq.current || !res?.ok) return;
      const incoming = res.chats || [];
      setChats((prev) => (mode === "more" ? [...prev, ...incoming] : incoming));
      loadedCount.current = mode === "more" ? loadedCount.current + incoming.length : incoming.length;
      setTotal(res.total ?? incoming.length);
      setHasMore(Boolean(res.has_more));
      if (res.counts) {
        setCounts(res.counts);
        if (!new URLSearchParams(window.location.search).get("status") && res.counts.attention > 0 && statusFilter === "all") {
          setStatusFilter("attention");
        }
      }
      if (!isPhone && !new URLSearchParams(window.location.search).get("session") && incoming.length > 0 && !selectedRef.current) {
        setSelectedSessionId(incoming[0].session_id);
        updateUrl(incoming[0].session_id, false);
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoadingList(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, statusFilter, channelFilter, isPhone, updateUrl]);

  useEffect(() => {
    if (!filtersReady) return;
    loadChats("reset");
  }, [filtersReady, statusFilter, channelFilter, debouncedSearch, loadChats]);

  useEffect(() => {
    if (!filtersReady) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadChats("silent");
    }, 30000);
    return () => clearInterval(id);
  }, [filtersReady, loadChats]);

  const chatSource = useMemo(() => {
    return selectedSessionId ? createDashboardChatSource(selectedSessionId) : null;
  }, [selectedSessionId]);

  const handleSelectChat = (id: string) => {
    setSelectedSessionId(id);
    updateUrl(id, isPhone);
  };

  const handleBack = () => {
    setSelectedSessionId(null);
    updateUrl(null, false);
  };

  return (
    <div className="h-[calc(100dvh-var(--app-top))] flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className={isPhone && selectedSessionId ? "hidden" : "w-full md:w-[340px] xl:w-[380px] shrink-0 h-full flex"}>
        <ChatList
          chats={chats}
          selectedSessionId={selectedSessionId}
          onSelectChat={handleSelectChat}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          channelFilter={channelFilter}
          onChannelFilterChange={setChannelFilter}
          search={search}
          onSearchChange={setSearch}
          counts={counts}
          total={total}
          hasMore={hasMore}
          loadingList={loadingList}
          loadingMore={loadingMore}
          onRefresh={() => loadChats("reset")}
          onLoadMore={() => loadChats("more")}
        />
      </div>

      <div className={`flex-1 h-full min-w-0 ${isPhone && !selectedSessionId ? "hidden" : "flex flex-col overflow-hidden bg-zinc-100/40 dark:bg-zinc-900/30"}`}>
        {chatSource ? (
          <Conversation
            key={selectedSessionId}
            source={chatSource}
            onBack={handleBack}
            onResetSuccess={() => {
              setChats((prev) => prev.filter((c) => c.session_id !== selectedSessionId));
              setSelectedSessionId(null);
              updateUrl(null, false);
              loadChats("silent");
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-zinc-400">
            Выберите диалог из списка для просмотра
          </div>
        )}
      </div>
    </div>
  );
}
