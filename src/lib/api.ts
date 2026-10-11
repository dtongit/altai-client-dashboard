import {
  ChatDetail,
  ChatSessionItem,
  KnowledgeResponse,
  OverviewData,
  SystemStatusResponse,
  User,
  Tenant,
  SimulatorResponse,
  SimulatorHistoryResponse,
} from "@/types";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://api.optima.altaiweb.online/api/v1/client";

// Normalize to correct API backend domain if missing api. subdomain
const API_BASE_URL = rawApiUrl.replace(
  /^https?:\/\/optima\.altaiweb\.online/,
  "https://api.optima.altaiweb.online"
);

// In-memory token storage (also mirrored in localStorage in browser)
let authToken: string | null = null;
let currentTenantId: string | null = null;

export function setAuthToken(token: string | null, tenantId?: string | null) {
  authToken = token;
  if (tenantId) currentTenantId = tenantId;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("altai_token", token);
      if (tenantId) localStorage.setItem("altai_tenant", tenantId);
    } else {
      localStorage.removeItem("altai_token");
      localStorage.removeItem("altai_tenant");
    }
  }
}

export function getStoredAuth() {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("altai_token");
    const tenantId = localStorage.getItem("altai_tenant");
    if (token) authToken = token;
    if (tenantId) currentTenantId = tenantId;
    return { token, tenantId };
  }
  return { token: authToken, tenantId: currentTenantId };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { token, tenantId } = getStoredAuth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Ошибка сервера (${res.status})`);
  }

  return await res.json();
}

export const api = {
  async login(username_or_email: string, password: string, tenant_id?: string) {
    const res = await request<{
      ok: boolean;
      token: string;
      user: User;
      tenant: Tenant;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username_or_email, password, tenant_id }),
    });
    setAuthToken(res.token, res.tenant.id);
    return res;
  },

  async getMe() {
    return request<{ ok: boolean; user: User; tenant: Tenant }>("/auth/me");
  },

  async getOverview(): Promise<OverviewData> {
    return request<OverviewData>("/overview");
  },

  async getChats(params: {
    channel?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ ok: boolean; total: number; chats: ChatSessionItem[] }> {
    const q = new URLSearchParams();
    if (params.channel) q.append("channel", params.channel);
    if (params.status) q.append("status", params.status);
    if (params.search) q.append("search", params.search);
    if (params.limit) q.append("limit", String(params.limit));
    if (params.offset) q.append("offset", String(params.offset));

    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<{ ok: boolean; total: number; chats: ChatSessionItem[] }>(`/chats${qs}`);
  },

  async getChatDetail(sessionId: string): Promise<ChatDetail> {
    return request<ChatDetail>(`/chats/${encodeURIComponent(sessionId)}`);
  },

  async pauseChat(sessionId: string, reason: string = "operator_takeover") {
    return request<{ ok: boolean; session_id: string; is_paused: boolean; message: string }>(
      `/chats/${encodeURIComponent(sessionId)}/pause`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  async resumeChat(sessionId: string) {
    return request<{ ok: boolean; session_id: string; is_paused: boolean; message: string }>(
      `/chats/${encodeURIComponent(sessionId)}/resume`,
      { method: "POST" }
    );
  },

  async toggleSystemActive(isActive?: boolean) {
    return request<{ ok: boolean; tenant_id: string; is_active: boolean; message: string }>(
      "/system/toggle-active",
      {
        method: "POST",
        body: JSON.stringify({ is_active: isActive }),
      }
    );
  },

  async getSystemStatus(): Promise<SystemStatusResponse> {
    return request<SystemStatusResponse>("/system/status");
  },

  async getKnowledge(): Promise<KnowledgeResponse> {
    return request<KnowledgeResponse>("/knowledge");
  },

  async sendSimulatorMessage(message: string, sessionId?: string): Promise<SimulatorResponse> {
    return request<SimulatorResponse>("/simulator/message", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  },

  async getSimulatorHistory(sessionId?: string): Promise<SimulatorHistoryResponse> {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    return request<SimulatorHistoryResponse>(`/simulator/history${query}`);
  },

  async resetSimulator(sessionId?: string): Promise<{ ok: boolean; message: string }> {
    return request<{ ok: boolean; message: string }>("/simulator/reset", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
};
