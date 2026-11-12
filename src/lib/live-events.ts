"use client";

export type LiveStatus = "live" | "polling";

const SLOW_RETRY_MS = 5 * 60 * 1000;
const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

export function subscribeLiveEvents(opts: {
  url: string;
  headers: () => Record<string, string>;
  onChatUpdated: (sessionId: string) => void;
  onStatus?: (s: LiveStatus) => void;
}): () => void {
  let isCancelled = false;
  let abortController: AbortController | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let consecutiveFailures = 0;

  const schedule = (ms: number) => {
    if (isCancelled) return;
    retryTimeout = setTimeout(connect, ms);
  };

  // A connection that ended (error or normal close) counts as a failed attempt unless it delivered data.
  const handleDisconnect = (receivedData: boolean) => {
    if (isCancelled) return;
    if (receivedData) consecutiveFailures = 0;
    consecutiveFailures++;
    if (consecutiveFailures >= 3) {
      opts.onStatus?.("polling");
      schedule(SLOW_RETRY_MS);
      return;
    }
    schedule(BACKOFF_MS[Math.min(consecutiveFailures - 1, BACKOFF_MS.length - 1)]);
  };

  async function connect() {
    if (isCancelled) return;

    abortController = new AbortController();
    let receivedData = false;
    try {
      const response = await fetch(opts.url, {
        headers: opts.headers(),
        signal: abortController.signal,
      });

      // 404: stream not available; 401/403: no access (an expired link surfaces through the page's own requests)
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        opts.onStatus?.("polling");
        schedule(SLOW_RETRY_MS);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP error ${response.status}`);
      }

      opts.onStatus?.("live");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!isCancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        // Any bytes (events or pings) prove the stream works
        receivedData = true;

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
      // Normal end of stream (server closed it): reconnect with backoff
      handleDisconnect(receivedData);
    } catch {
      handleDisconnect(receivedData);
    }
  }

  connect();

  return () => {
    isCancelled = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    if (abortController) abortController.abort();
  };
}
