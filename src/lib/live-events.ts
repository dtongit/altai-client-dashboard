"use client";

export type LiveStatus = "live" | "polling";

export function subscribeLiveEvents(opts: {
  url: string;
  headers: () => Record<string, string>;
  onChatUpdated: (sessionId: string) => void;
  onStatus?: (s: LiveStatus) => void;
}): () => void {
  let isCancelled = false;
  let abortController: AbortController | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;
  let consecutiveFailures = 0;

  const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

  const connect = async () => {
    if (isCancelled) return;

    abortController = new AbortController();
    try {
      const response = await fetch(opts.url, {
        headers: opts.headers(),
        signal: abortController.signal,
      });

      if (response.status === 404) {
        // SSE not implemented yet by backend
        opts.onStatus?.("polling");
        retryTimeout = setTimeout(connect, 5 * 60 * 1000);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP error ${response.status}`);
      }

      // Successfully connected
      consecutiveFailures = 0;
      opts.onStatus?.("live");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!isCancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventName = "message";
          let dataStr = "";

          for (const line of block.split(/\r?\n/)) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.slice(5).trim();
            }
          }

          if (eventName === "chat.updated") {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.session_id) {
                opts.onChatUpdated(parsed.session_id);
              }
            } catch {
              // ignore malformed data
            }
          }
        }
      }
    } catch {
      if (isCancelled) return;

      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        opts.onStatus?.("polling");
        retryTimeout = setTimeout(connect, 5 * 60 * 1000);
        return;
      }

      const backoff = BACKOFF_MS[Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1)];
      retryTimeout = setTimeout(connect, backoff);
    }
  };

  connect();

  return () => {
    isCancelled = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    if (abortController) abortController.abort();
  };
}
