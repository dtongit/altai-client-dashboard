"use client";

import { API_BASE_URL } from "./api";
import type { ChatSource } from "./chat-source";
import type { ChatLinkDetail, ChatCrm, SendMessageResult } from "@/types";

export const CHAT_LINK_STORAGE_KEY = "altai_chat_link";

export const CHAT_LINK_BASE_URL = API_BASE_URL.replace(
  /\/api\/v1\/client\/?$/,
  "/api/v1/chat-link"
);

export function getStoredChatLinkToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(CHAT_LINK_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredChatLinkToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHAT_LINK_STORAGE_KEY);
  } catch {}
}

export function extractChatLinkToken(): string | null {
  if (typeof window === "undefined") return null;

  const rawHash = window.location.hash.replace(/^#/, "");
  if (rawHash) {
    const params = new URLSearchParams(rawHash);
    const token =
      params.get("t") ||
      params.get("token") ||
      (rawHash.startsWith("t=") ? rawHash.slice(2) : rawHash);

    if (token) {
      try {
        sessionStorage.setItem(CHAT_LINK_STORAGE_KEY, token);
      } catch {}
      window.history.replaceState(null, "", "/c/");
      return token;
    }
  }

  return getStoredChatLinkToken();
}

export class ChatLinkApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ChatLinkApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function chatLinkRequest<T>(
  token: string,
  endpoint: string = "",
  options: RequestInit = {}
): Promise<T> {
  const url = `${CHAT_LINK_BASE_URL}${endpoint}`;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Authorization: `ChatLink ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detailMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (typeof errJson?.detail === "string") {
        detailMsg = errJson.detail;
      } else if (errJson?.message) {
        detailMsg = errJson.message;
      }
    } catch {}
    throw new ChatLinkApiError(res.status, detailMsg);
  }

  return res.json();
}

export function createChatLinkSource(token: string): ChatSource {
  return {
    async getDetail() {
      return chatLinkRequest<ChatLinkDetail>(token, "");
    },
    async send(text: string, files: File[]) {
      if (files && files.length > 0) {
        const fd = new FormData();
        if (text) fd.append("text", text);
        for (const f of files) {
          fd.append("files", f);
        }
        return chatLinkRequest<SendMessageResult>(token, "/message", {
          method: "POST",
          body: fd,
        });
      } else {
        return chatLinkRequest<SendMessageResult>(token, "/message", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
      }
    },
    async sendDraft(approvalId: string, scope?: "all" | "comment_only") {
      await chatLinkRequest<{ ok: boolean; sent?: boolean }>(token, "/draft/send", {
        method: "POST",
        body: JSON.stringify({ approval_id: approvalId, scope }),
      });
    },
    async regenerateDraft(approvalId: string, note: string) {
      await chatLinkRequest<{ ok: boolean }>(token, "/draft/regenerate", {
        method: "POST",
        body: JSON.stringify({ approval_id: approvalId, note }),
      });
    },
    async take() {
      await chatLinkRequest<{ ok: boolean }>(token, "/take", {
        method: "POST",
      });
    },
    async resume(triggerReply = false) {
      const qs = triggerReply ? "?trigger_reply=true" : "";
      await chatLinkRequest<{ ok: boolean }>(token, `/resume${qs}`, {
        method: "POST",
      });
    },
    async pause() {
      await chatLinkRequest<{ ok: boolean }>(token, "/take", {
        method: "POST",
      });
    },
    async getCrm(force = false) {
      const qs = force ? "?force=true" : "";
      return chatLinkRequest<ChatCrm>(token, `/crm${qs}`);
    },
  };
}
