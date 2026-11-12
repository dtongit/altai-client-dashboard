"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, getStoredAuth, API_BASE_URL } from "@/lib/api";
import type { ChatSessionItem, ChatsCounts } from "@/types";
import { ChatList, ChatStatusTab } from "@/components/chat/ChatList";
import { Conversation } from "@/components/chat/Conversation";
import { createDashboardChatSource } from "@/lib/chat-source";
import { subscribeLiveEvents, LiveStatus } from "@/lib/live-events";
import { updateAttentionCount } from "@/lib/use-attention-count";

const PAGE_SIZE = 50;

export default function ChatsPage() {
  const { user, tenant } = useAuth();
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
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("live");

  const reqSeq = useRef(0);
  const loadedCount = useRef(0);
  const inFlight = useRef(false);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedSessionId;
  // Default «Внимание» tab is applied once, on the first list load, and only when the URL had no status
  const urlHadStatusRef = useRef(false);
  const defaultTabAppliedRef = useRef(false);
  // True when the open chat was added to history with pushState (phone list -> chat)
  const openedByPushRef = useRef(false);
  const loadChatsRef = useRef<(mode?: "reset" | "more" | "silent") => Promise<void>>(async () => {});

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 768);
    const onPop = () => {
      openedByPushRef.current = false;
      setSelectedSessionId(new URLSearchParams(window.location.search).get("session"));
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("popstate", onPop);

    const p = new URLSearchParams(window.location.search);
    const sid = p.get("session");
    if (sid) setSelectedSessionId(sid);
    const st = p.get("status") as ChatStatusTab;
    urlHadStatusRef.current = Boolean(st);
    if (st && ["all", "attention", "paused", "mine"].includes(st)) setStatusFilter(st);
    setChannelFilter(p.get("channel") || "");
    setFiltersReady(true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const updateUrl = useCallback((sid: string | null, push = false) => {
    const p = new URLSearchParams();
    if (sid) p.set("session", sid);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (channelFilter) p.set("channel", channelFilter);
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    push ? window.history.pushState(null, "", url) : window.history.replaceState(null, "", url);
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    if (filtersReady) updateUrl(selectedSessionId, false);
  }, [filtersReady, statusFilter, channelFilter, updateUrl, selectedSessionId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadChats = useCallback(async (mode: "reset" | "more" | "silent" = "reset") => {
    if (inFlight.current && mode === "silent") return;
    const seq = ++reqSeq.current;
    if (mode === "reset") setLoadingList(true);
    if (mode === "more") setLoadingMore(true);
    if (mode === "silent") inFlight.current = true;

    try {
      const res = await api.getChats({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        channel: channelFilter || undefined,
        limit: mode === "silent" ? Math.min(200, Math.max(PAGE_SIZE, loadedCount.current)) : PAGE_SIZE,
        offset: mode === "more" ? loadedCount.current : 0,
      });

      if (seq !== reqSeq.current || !res?.ok) return;
      const incoming = res.chats || [];
      setChats((prev) => (mode === "more" ? [...prev, ...incoming] : incoming));
      loadedCount.current = mode === "more" ? loadedCount.current + incoming.length : incoming.length;
      setTotal(res.total ?? incoming.length);
      setHasMore(Boolean(res.has_more));
      if (res.counts) {
        setCounts(res.counts);
        if (typeof res.counts.attention === "number") updateAttentionCount(res.counts.attention);
        if (!defaultTabAppliedRef.current) {
          defaultTabAppliedRef.current = true;
          if (!urlHadStatusRef.current && res.counts.attention > 0 && statusFilter === "all") {
            setStatusFilter("attention");
          }
        }
      }
      if (!isPhone && !new URLSearchParams(window.location.search).get("session") && incoming.length > 0 && !selectedRef.current) {
        setSelectedSessionId(incoming[0].session_id);
        updateUrl(incoming[0].session_id, false);
      }
    } finally {
      inFlight.current = false;
      if (seq === reqSeq.current) {
        setLoadingList(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, statusFilter, channelFilter, isPhone, updateUrl]);

  loadChatsRef.current = loadChats;

  useEffect(() => {
    if (filtersReady) loadChats("reset");
  }, [filtersReady, statusFilter, channelFilter, debouncedSearch, loadChats]);

  // Subscribe once per tenant; latest loadChats / selected chat are read from refs
  const tenantId = tenant?.id;
  useEffect(() => {
    if (!filtersReady) return;
    const unsub = subscribeLiveEvents({
      url: `${API_BASE_URL}/events`,
      headers: () => {
        const { token, tenantId } = getStoredAuth();
        return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenantId ? { "X-Tenant-ID": tenantId } : {}) };
      },
      onChatUpdated: (sid) => {
        loadChatsRef.current("silent");
        if (sid === selectedRef.current) window.dispatchEvent(new CustomEvent("chat-updated", { detail: sid }));
      },
      onStatus: setLiveStatus,
    });
    return () => unsub();
  }, [filtersReady, tenantId]);

  useEffect(() => {
    if (!filtersReady) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadChatsRef.current("silent");
    }, liveStatus === "polling" ? 30000 : 60000);

    const onVis = () => { if (document.visibilityState === "visible") loadChatsRef.current("silent"); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [filtersReady, liveStatus]);

  const chatSource = useMemo(() => {
    return selectedSessionId ? createDashboardChatSource(selectedSessionId) : null;
  }, [selectedSessionId]);

  const handleSelectChat = (id: string) => {
    setSelectedSessionId(id);
    setChats((prev) => prev.map((c) => (c.session_id === id ? { ...c, unread: false } : c)));
    updateUrl(id, isPhone);
    openedByPushRef.current = isPhone;
  };

  // Close the open chat. On phones, if it was opened with pushState, go back in history so Back needs one press.
  const closeChat = () => {
    if (isPhone && openedByPushRef.current) {
      openedByPushRef.current = false;
      window.history.back(); // the popstate handler shows the list
      return;
    }
    setSelectedSessionId(null);
    updateUrl(null, false);
  };

  return (
    <div className="h-[calc(100dvh-var(--app-top)-var(--app-bottom))] flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
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
          currentUserId={user?.id}
          isPolling={liveStatus === "polling"}
        />
      </div>

      <div className={`flex-1 h-full min-w-0 ${isPhone && !selectedSessionId ? "hidden" : "flex flex-col overflow-hidden bg-zinc-100/40 dark:bg-zinc-900/30"}`}>
        {chatSource ? (
          <Conversation
            key={selectedSessionId}
            source={chatSource}
            onBack={closeChat}
            livePolling={liveStatus === "polling"}
            isAdmin={Boolean(user?.is_admin)}
            onResetSuccess={() => {
              setChats((prev) => prev.filter((c) => c.session_id !== selectedSessionId));
              closeChat();
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
