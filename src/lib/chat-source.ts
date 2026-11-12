import type { ChatDetail, ChatCrm, SendMessageResult } from "@/types";
import { api } from "./api";

export interface ChatSource {
  getDetail(): Promise<ChatDetail>;
  getCrm(refresh?: boolean): Promise<ChatCrm | null>; // null on 404/error
  send(text: string, files: File[]): Promise<SendMessageResult | void>;   // throws {detail, reason}
  take(): Promise<void>;
  release?(): Promise<void>;                          // absent on the link page
  pause(): Promise<void>;
  resume(triggerReply: boolean): Promise<void>;
  sendDraft(approvalId: string, scope?: "all" | "comment_only"): Promise<void>;
  regenerateDraft(approvalId: string, note: string): Promise<void>;
  markRead?(): Promise<void>;
  reset?(): Promise<void>;                            // dashboard + can_reset only
  openChatHref?(sessionId: string): string;          // for "other chats" links
}

export function createDashboardChatSource(sessionId: string): ChatSource {
  return {
    async getDetail() {
      return api.getChatDetail(sessionId);
    },
    async getCrm(refresh?: boolean) {
      return api.getChatCrm(sessionId, refresh);
    },
    async send(text: string, files: File[]) {
      return api.sendOperatorMessage(sessionId, text, files);
    },
    async take() {
      await api.takeChat(sessionId);
    },
    async release() {
      await api.releaseChat(sessionId);
    },
    async pause() {
      await api.pauseChat(sessionId);
    },
    async resume(triggerReply: boolean) {
      await api.resumeChat(sessionId, triggerReply);
    },
    async sendDraft(approvalId: string, scope?: "all" | "comment_only") {
      await api.sendDraft(sessionId, approvalId, scope);
    },
    async regenerateDraft(approvalId: string, note: string) {
      await api.regenerateDraft(sessionId, approvalId, note);
    },
    async markRead() {
      await api.markChatRead(sessionId);
    },
    async reset() {
      await api.resetChat(sessionId);
    },
    openChatHref(otherSessionId: string) {
      return `/chats/?session=${encodeURIComponent(otherSessionId)}`;
    },
  };
}
