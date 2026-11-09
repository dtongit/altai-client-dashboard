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
  CustomToolItem,
  CustomToolVersionItem,
  SandboxExecutionResult,
  AdminCrudResourceSchema,
  ChannelsResponse,
  ChannelMode,
  SetChannelModeResponse,
  UmnicoStatus,
  AdminChatTraceResponse,
  TeamTraceResponse,
  TeamMember,
  TeamBotAdminResponse,
  TeamUser,
  AuditLogEntry,
  TeamInviteResponse,
  TeamMembersResponse,
  TeamBotConversation,
  TeamBotLogEvent,
  KnowledgeNode,
  KbMediaItem,
  KnowledgeNodeVersion,
  DeletedKnowledgeNode,
  PromptModule,
  SemanticSkillCard,
  PromptPreviewResponse,
} from "@/types";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://api.optima.altaiweb.online/api/v1/client";

// Normalize to correct API backend domain if missing api. subdomain
const API_BASE_URL = rawApiUrl.replace(
  /^https?:\/\/optima\.altaiweb\.online/,
  "https://api.optima.altaiweb.online"
);

const ADMIN_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/api/v1/admin");

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
      permissions?: string[];
      allowed_employees?: string[];
      role?: string;
      available_tenants?: Array<{ id: string; business_name: string; is_active?: boolean }>;
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
      permissions?: string[];
      allowed_employees?: string[];
      role?: string;
      available_tenants?: Array<{ id: string; business_name: string; is_active?: boolean }>;
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

  async resumeChat(sessionId: string, triggerReply: boolean = false) {
    return request<{
      ok: boolean;
      session_id: string;
      is_paused: boolean;
      triggered_reply?: boolean;
      message: string;
    }>(
      `/chats/${encodeURIComponent(sessionId)}/resume?trigger_reply=${triggerReply}`,
      {
        method: "POST",
        body: JSON.stringify({ trigger_reply: triggerReply }),
      }
    );
  },

  async sendChatMessage(sessionId: string, text: string) {
    return request<{ ok: boolean; session_id: string; message: string }>(
      `/chats/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      }
    );
  },

  async resetChat(sessionId: string) {
    return request<{
      ok: boolean;
      session_id: string;
      rows_deleted: number;
      is_paused: boolean;
      message: string;
    }>(`/chats/${encodeURIComponent(sessionId)}/reset`, {
      method: "POST",
    });
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

  /** The invite binds to the calling user; the backend ignores any role (roles epic #75). */
  async createTeamInvite(): Promise<TeamInviteResponse> {
    return request<TeamInviteResponse>("/team/invite", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Users, access and audit log (roles epic #75)
  async getUsers(): Promise<{ ok: boolean; users: TeamUser[]; bot_username?: string }> {
    return request("/users");
  },

  async createUser(data: {
    username: string;
    email?: string;
    password?: string;
    permissions: string[];
    employee_ids: "*" | string[];
  }): Promise<{ ok: boolean; existing_account?: boolean; user?: TeamUser }> {
    return request("/users", { method: "POST", body: JSON.stringify(data) });
  },

  async updateUser(
    userId: string,
    data: {
      permissions?: string[];
      employee_ids?: "*" | string[];
      is_active?: boolean;
      password?: string;
    }
  ): Promise<{ ok: boolean; user?: TeamUser }> {
    return request(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /** Removes the membership; the account stays. */
  async removeUser(userId: string): Promise<{ ok: boolean }> {
    return request(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  },

  // Superadmin: a tenant's own team bot (spec M8). Same admin base as /crud.
  async setTenantTeamBot(
    tenantId: string,
    data: { token: string; username: string }
  ): Promise<TeamBotAdminResponse> {
    return request(
      `/tenants/${encodeURIComponent(tenantId)}/team-bot`,
      { method: "POST", body: JSON.stringify(data) },
      ADMIN_API_BASE_URL
    );
  },

  async clearTenantTeamBot(tenantId: string): Promise<TeamBotAdminResponse> {
    return request(
      `/tenants/${encodeURIComponent(tenantId)}/team-bot`,
      { method: "DELETE" },
      ADMIN_API_BASE_URL
    );
  },

  async createUserTelegramInvite(userId: string): Promise<TeamInviteResponse> {
    return request<TeamInviteResponse>(`/users/${encodeURIComponent(userId)}/telegram-invite`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async getAuditLog(params?: { limit?: number; offset?: number; action?: string }): Promise<{
    ok: boolean;
    entries?: AuditLogEntry[];
    items?: AuditLogEntry[];
    total?: number;
  }> {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    if (params?.action) q.set("action", params.action);
    const qs = q.toString();
    return request(`/audit-log${qs ? `?${qs}` : ""}`);
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

  async getChannels(): Promise<ChannelsResponse> {
    return request<ChannelsResponse>("/channels");
  },

  async setChannelMode(id: string, mode: ChannelMode): Promise<SetChannelModeResponse> {
    return request<SetChannelModeResponse>(`/channels/${encodeURIComponent(id)}/mode`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
  },

  async getUmnicoStatus(): Promise<UmnicoStatus> {
    return request<UmnicoStatus>("/umnico/status");
  },

  async connectUmnico(apiToken: string): Promise<{ ok: boolean; message?: string }> {
    return request("/umnico/connect", {
      method: "POST",
      body: JSON.stringify({ api_token: apiToken }),
    });
  },

  // ==========================================================================
  // Employee config & Custom JS Sandbox Tools Studio
  // ==========================================================================

  async getEmployeeConfig(employeeId: string = "vera"): Promise<EmployeeConfigResponse> {
    return request<EmployeeConfigResponse>(`/employees/${encodeURIComponent(employeeId)}/config`);
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
  ): Promise<{ ok: boolean; item: Record<string, any>; api_key?: string }> {
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

  // ==========================================================================
  // Team Bot Chats & Logs
  // ==========================================================================

  async listTeamChats(tenantId?: string): Promise<{
    ok: boolean;
    bot_username?: string;
    conversations?: TeamBotConversation[];
    chats?: TeamBotConversation[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/team-chats${qs}`, {}, ADMIN_API_BASE_URL);
  },

  async getTeamChatHistory(telegramUserId: string, limit: number = 50): Promise<{
    ok: boolean;
    bot_username?: string;
    telegram_user_id: string;
    events: TeamBotLogEvent[];
  }> {
    return request(
      `/team-chats/${encodeURIComponent(telegramUserId)}?limit=${limit}`,
      {},
      ADMIN_API_BASE_URL
    );
  },

  async getTeamChatTrace(telegramUserId: string, tenantId?: string, limit: number = 50): Promise<TeamTraceResponse> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (tenantId) q.append("tenant_id", tenantId);
    return request(
      `/team-chats/${encodeURIComponent(telegramUserId)}/trace?${q.toString()}`,
      {},
      ADMIN_API_BASE_URL
    );
  },

  async sendTeamChatMessage(
    telegramUserId: string,
    message: string,
    tenantId?: string
  ): Promise<{
    ok: boolean;
    sent?: boolean;
    event?: TeamBotLogEvent;
  }> {
    return request(
      `/team-chats/${encodeURIComponent(telegramUserId)}/send`,
      {
        method: "POST",
        body: JSON.stringify({ message, tenant_id: tenantId }),
      },
      ADMIN_API_BASE_URL
    );
  },

  // ==========================================================================
  // Dynamic Knowledge Base (Mind-Map & L0/L1/L2)
  // ==========================================================================

  async getKnowledgeNodes(tenantId?: string): Promise<{
    ok: boolean;
    tenant_id: string;
    nodes: KnowledgeNode[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes${qs}`);
  },

  async getDeletedKnowledgeNodes(tenantId?: string): Promise<{
    ok: boolean;
    nodes: DeletedKnowledgeNode[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes/deleted${qs}`);
  },

  async uploadKnowledgeMedia(file: File, caption?: string): Promise<KbMediaItem> {
    const { token, tenantId } = getStoredAuth();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    const res = await fetch(`${API_BASE_URL}/knowledge/media`, {
      method: "POST",
      headers, // no Content-Type: the browser sets the multipart boundary
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Ошибка сервера (${res.status})`);
    }
    const data = await res.json();
    return data.item as KbMediaItem;
  },

  async upsertKnowledgeNode(payload: {
    path: string;
    title: string;
    summary: string;
    content: string;
    parent_path?: string | null;
    node_type?: string;
    tier?: string;
    media_attachments?: any[];
    high_confidence_triggers?: string[];
    allowed_employees?: string[];
    allowed_roles?: string[];
    valid_from?: string | null;
    valid_until?: string | null;
    change_description?: string;
  }, tenantId?: string): Promise<{
    ok: boolean;
    node: KnowledgeNode;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes${qs}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteKnowledgeNode(nodeId: string, tenantId?: string): Promise<{
    ok: boolean;
    node_id: string;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}${qs}`, {
      method: "DELETE",
    });
  },

  async getKnowledgeNodeVersions(nodeId: string, tenantId?: string): Promise<{
    ok: boolean;
    node_id: string;
    current_version: number | null;
    versions: KnowledgeNodeVersion[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/versions${qs}`);
  },

  async restoreKnowledgeNodeVersion(nodeId: string, versionId: number, tenantId?: string): Promise<{
    ok: boolean;
    node: KnowledgeNode;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/restore${qs}`, {
      method: "POST",
      body: JSON.stringify({ version_id: versionId }),
    });
  },

  // ==========================================================================
  // Modular Prompts Studio
  // ==========================================================================

  async getPromptModules(tenantId?: string): Promise<{
    ok: boolean;
    tenant_id: string;
    modules: PromptModule[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/prompts/modules${qs}`);
  },

  async upsertPromptModule(payload: {
    slug: string;
    name: string;
    override_mode?: string;
    category?: string;
    priority_order?: number;
    allowed_employees?: string[];
    allowed_roles?: string[];
    allowed_channels?: string[];
    case_tags?: string[];
    content: string;
    change_description?: string;
  }, tenantId?: string): Promise<{
    ok: boolean;
    module: PromptModule;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/prompts/modules${qs}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async togglePromptModule(slug: string, isActive: boolean, tenantId?: string): Promise<{
    ok: boolean;
    slug: string;
    is_active: boolean;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/prompts/modules/${encodeURIComponent(slug)}/toggle${qs}`, {
      method: "POST",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  // ==========================================================================
  // Semantic Skill Cards & Prompt Preview
  // ==========================================================================

  async getSkillCards(tenantId?: string): Promise<{
    ok: boolean;
    tenant_id: string;
    cards: SemanticSkillCard[];
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/skills/cards${qs}`);
  },

  async saveSkillCard(payload: {
    group_slug: string;
    group_name?: string;
    prompt_rules?: string;
    secrets?: Array<{ key_name: string; value?: string; description?: string }>;
  }, tenantId?: string): Promise<{
    ok: boolean;
    group_slug: string;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/skills/cards${qs}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPromptPreview(params?: {
    employee?: string;
    role?: string;
    channel?: string;
    case_tag?: string;
  }, tenantId?: string): Promise<PromptPreviewResponse> {
    const query = new URLSearchParams();
    if (tenantId) query.set("tenant_id", tenantId);
    if (params?.employee) query.set("employee", params.employee);
    if (params?.role) query.set("role", params.role);
    if (params?.channel) query.set("channel", params.channel);
    if (params?.case_tag) query.set("case_tag", params.case_tag);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request(`/prompts/preview${qs}`);
  },
};
