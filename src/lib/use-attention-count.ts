"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

let globalCount = 0;
const listeners = new Set<(count: number) => void>();

function notify(count: number) {
  globalCount = count;
  listeners.forEach((l) => l(count));
}

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

export function useAttentionCount() {
  const [count, setCount] = useState<number>(globalCount);

  useEffect(() => {
    listeners.add(setCount);
    refreshAttentionCount();

    const interval = setInterval(() => {
      refreshAttentionCount();
    }, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshAttentionCount();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      listeners.delete(setCount);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return count;
}
