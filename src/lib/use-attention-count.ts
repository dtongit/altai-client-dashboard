"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

// One module-level store shared by every hook instance (sidebar + bottom nav are both always mounted):
// a single timer and a single visibilitychange listener while at least one subscriber exists.
let globalCount = 0;
const listeners = new Set<(count: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function notify(count: number) {
  globalCount = count;
  listeners.forEach((l) => l(count));
}

/** Push a fresh value (e.g. from the inbox list response) so the badge follows immediately. */
export function updateAttentionCount(count: number) {
  notify(count);
}

export function refreshAttentionCount() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
  api
    .getChats({ limit: 1 })
    .then((res) => {
      const att = res?.counts?.attention;
      if (typeof att === "number") {
        notify(att);
      }
    })
    .catch(() => {});
}

function onVisibility() {
  if (document.visibilityState === "visible") refreshAttentionCount();
}

function start() {
  refreshAttentionCount();
  timer = setInterval(refreshAttentionCount, 60_000);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisibility);
}

export function useAttentionCount() {
  const [count, setCount] = useState<number>(globalCount);

  useEffect(() => {
    listeners.add(setCount);
    setCount(globalCount);
    if (listeners.size === 1) start();

    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0) stop();
    };
  }, []);

  return count;
}
