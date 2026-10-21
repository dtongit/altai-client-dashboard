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
  EmployeeConfigResponse,
  ConfiguratorChatResponse,
  CustomToolItem,
  CustomToolVersionItem,
  SandboxExecutionResult,
  AdminCrudResourceSchema,
  InstagramStatus,
  AdminChatTraceResponse,
  TeamMember,
  TeamInviteResponse,
  TeamMembersResponse,
} from "@/types";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://api.optima.altaiweb.online/api/v1/client";

// Normalize to correct API backend domain if missing api. subdomain
const API_BASE_URL = rawApiUrl.replace(
  /^https?:\/\/optima\.altaiweb\.online/,
  "https://api.optima.altaiweb.online"
);

const ADMIN_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/api/v1/admin");
const DEMO_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/api/v1/demo");

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

export function setSelectedTenant(tenantId: string) {
  currentTenantId = tenantId;
  if (typeof window !== "undefined") {
    localStorage.setItem("altai_tenant", tenantId);
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

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = API_BASE_URL
): Promise<T> {
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

  const res = await fetch(`${baseUrl}${endpoint}`, {
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
      available_tenants?: Array<{ id: string; business_name: string; is_active: boolean }>;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username_or_email, password, tenant_id }),
    });
    setAuthToken(res.token, res.tenant.id);
    return res;
  },

  async getMe() {
    return request<{
      ok: boolean;
      user: User;
      tenant: Tenant;
      available_tenants?: Array<{ id: string; business_name: string; is_active: boolean }>;
    }>("/auth/me");
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

  async updateKnowledge(params: {
    raw_markdown?: string;
    company_info?: string;
    pricing_policies?: string;
    faq_and_objections?: string;
    change_description?: string;
  }): Promise<{ ok: boolean; version: number; message: string }> {
    return request<{ ok: boolean; version: number; message: string }>("/knowledge", {
      method: "PUT",
      body: JSON.stringify(params),
    });
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

  async getTelegramStatus(): Promise<{
    ok: boolean;
    bot_username: string;
    bot_url: string;
    has_subscribers: boolean;
    subscribers_count: number;
    subscribers: Array<{ chat_id?: string; username?: string; first_name?: string }>;
  }> {
    return request("/telegram/status");
  },

  async confirmTelegramSubscriber(chatId?: string, username?: string): Promise<{
    ok: boolean;
    message: string;
    subscriber: any;
  }> {
    return request("/telegram/confirm", {
      method: "POST",
      body: JSON.stringify({ chat_id: chatId, username }),
    });
  },

  async getTeamMembers(): Promise<TeamMembersResponse> {
    return request<TeamMembersResponse>("/team/members");
  },

  async createTeamInvite(role: "senior" | "manager" = "manager"): Promise<TeamInviteResponse> {
    return request<TeamInviteResponse>("/team/invite", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  async updateTeamMember(
    memberId: string,
    data: {
      role?: string;
      can_modify_instructions?: boolean;
      can_manage_team?: boolean;
      is_active?: boolean;
    }
  ): Promise<{ ok: boolean; member: TeamMember }> {
    return request<{ ok: boolean; member: TeamMember }>(`/team/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteTeamMember(memberId: string): Promise<{ ok: boolean; deleted_id: string }> {
    return request<{ ok: boolean; deleted_id: string }>(`/team/members/${memberId}`, {
      method: "DELETE",
    });
  },

  async getInstagramStatus(): Promise<InstagramStatus> {
    return request<InstagramStatus>("/instagram/status");
  },

  async connectInstagramUmnico(apiToken: string, replyToComments: boolean = false): Promise<{
    ok: boolean;
    message: string;
    user_id?: number;
    user_name?: string;
    instagram_login?: string;
    webhook_id?: number;
    enabled: boolean;
  }> {
    return request("/instagram/connect", {
      method: "POST",
      body: JSON.stringify({ api_token: apiToken, reply_to_comments: replyToComments }),
    });
  },

  async toggleInstagram(enabled: boolean): Promise<{
    ok: boolean;
    enabled: boolean;
    message: string;
  }> {
    return request("/instagram/toggle", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },

  // ==========================================================================
  // Employee Configurator & Custom JS Sandbox Tools Studio
  // ==========================================================================

  async getEmployeeConfig(employeeId: string = "vera"): Promise<EmployeeConfigResponse> {
    return request<EmployeeConfigResponse>(`/employees/${encodeURIComponent(employeeId)}/config`);
  },

  async sendConfiguratorChat(
    employeeId: string,
    message: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<ConfiguratorChatResponse> {
    return request<ConfiguratorChatResponse>(
      `/employees/${encodeURIComponent(employeeId)}/configurator/chat`,
      {
        method: "POST",
        body: JSON.stringify({ message, history }),
      }
    );
  },

  async rollbackEmployeePrompt(
    employeeId: string,
    targetVersion: number
  ): Promise<{ ok: boolean; current_version: number; content: string; message: string }> {
    return request(`/employees/${encodeURIComponent(employeeId)}/prompts/rollback`, {
      method: "POST",
      body: JSON.stringify({ target_version: targetVersion }),
    });
  },

  async upsertEmployeeTool(
    employeeId: string,
    payload: {
      name: string;
      description: string;
      parameters_schema: Record<string, any>;
      code: string;
      is_active?: boolean;
      change_description?: string;
      test_payload?: Record<string, any>;
    }
  ): Promise<{ ok: boolean; tool: CustomToolItem; sandbox_test: SandboxExecutionResult }> {
    return request(`/employees/${encodeURIComponent(employeeId)}/tools`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async testEmployeeTool(
    employeeId: string,
    toolId: string,
    payload: Record<string, any>,
    code?: string
  ): Promise<{ ok: boolean; sandbox_test: SandboxExecutionResult }> {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/tools/${encodeURIComponent(toolId)}/test`,
      {
        method: "POST",
        body: JSON.stringify({ code, payload }),
      }
    );
  },

  async toggleEmployeeTool(
    employeeId: string,
    toolId: string,
    isActive: boolean
  ): Promise<{ ok: boolean; id: string; is_active: boolean }> {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/tools/${encodeURIComponent(toolId)}/toggle`,
      {
        method: "POST",
        body: JSON.stringify({ is_active: isActive }),
      }
    );
  },

  async getEmployeeToolVersions(
    employeeId: string,
    toolId: string
  ): Promise<{ ok: boolean; versions: CustomToolVersionItem[] }> {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/tools/${encodeURIComponent(toolId)}/versions`
    );
  },

  async deleteEmployeeTool(
    employeeId: string,
    toolId: string
  ): Promise<{ ok: boolean; message: string }> {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/tools/${encodeURIComponent(toolId)}`,
      { method: "DELETE" }
    );
  },

  async upsertEmployeeSecret(
    employeeId: string,
    keyName: string,
    value: string
  ): Promise<{ ok: boolean; key_name: string; message: string }> {
    return request(`/employees/${encodeURIComponent(employeeId)}/secrets`, {
      method: "POST",
      body: JSON.stringify({ key_name: keyName, value }),
    });
  },

  async deleteEmployeeSecret(
    employeeId: string,
    keyName: string
  ): Promise<{ ok: boolean; message: string }> {
    return request(
      `/employees/${encodeURIComponent(employeeId)}/secrets/${encodeURIComponent(keyName)}`,
      { method: "DELETE" }
    );
  },

  // ==========================================================================
  // Superadmin Console CRUD (SQLAdmin Replacement)
  // ==========================================================================

  async getAdminCrudSchema(): Promise<{ ok: boolean; resources: AdminCrudResourceSchema[] }> {
    return request("/crud/schema", {}, ADMIN_API_BASE_URL);
  },

  async listAdminCrud(
    resource: string,
    params: { search?: string; limit?: number; offset?: number } = {}
  ): Promise<{ ok: boolean; resource: string; total: number; items: Record<string, any>[] }> {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.limit) q.append("limit", String(params.limit));
    if (params.offset) q.append("offset", String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request(`/crud/${encodeURIComponent(resource)}${qs}`, {}, ADMIN_API_BASE_URL);
  },

  async createAdminCrud(
    resource: string,
    body: Record<string, any>
  ): Promise<{ ok: boolean; item: Record<string, any> }> {
    return request(
      `/crud/${encodeURIComponent(resource)}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      ADMIN_API_BASE_URL
    );
  },

  async updateAdminCrud(
    resource: string,
    id: string | number,
    body: Record<string, any>
  ): Promise<{ ok: boolean; item: Record<string, any> }> {
    return request(
      `/crud/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      ADMIN_API_BASE_URL
    );
  },

  async deleteAdminCrud(
    resource: string,
    id: string | number
  ): Promise<{ ok: boolean; deleted: string }> {
    return request(
      `/crud/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}`,
      { method: "DELETE" },
      ADMIN_API_BASE_URL
    );
  },

  async getAdminStats(tenantId?: string): Promise<Record<string, any>> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/stats${qs}`, {}, ADMIN_API_BASE_URL);
  },

  async listAdminChats(params?: {
    search?: string;
    tenant_id?: string;
    channel?: string;
    limit?: number;
  }): Promise<{ total_sessions: number; sessions: any[] }> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.tenant_id) q.append("tenant_id", params.tenant_id);
    if (params?.channel) q.append("channel", params.channel);
    if (params?.limit) q.append("limit", String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request(`/chats${qs}`, {}, ADMIN_API_BASE_URL);
  },

  async getAdminChatTrace(sessionId: string): Promise<AdminChatTraceResponse> {
    return request(`/chats/${encodeURIComponent(sessionId)}`, {}, ADMIN_API_BASE_URL);
  },

  async getDemoConfig(tenantId: string): Promise<{
    tenant_id: string;
    business_name: string;
    welcome_message: string;
    suggested_questions: string[];
    max_message_length: number;
  }> {
    const res = await fetch(
      `${DEMO_API_BASE_URL}/config?tenant_id=${encodeURIComponent(tenantId)}`
    );
    if (!res.ok) {
      throw new Error("Не удалось загрузить настройки демо");
    }
    return res.json();
  },

  async sendDemoChat(payload: {
    tenant_id: string;
    message: string;
    session_id?: string;
  }): Promise<{
    ok: boolean;
    session_id: string;
    tenant_id: string;
    assistant_response: string;
    latency_ms: number;
    waited_seconds: number;
    status: string;
    error?: string | null;
  }> {
    const res = await fetch(`${DEMO_API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Ошибка при отправке сообщения");
    }
    return res.json();
  },
};
