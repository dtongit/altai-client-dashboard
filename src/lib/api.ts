import {
  BossMessage,
  ChatDetail,
  ChatsListResponse,
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
  KbNodeAction,
  NewKbNodeAction,
  KbActionsDisposition,
  PromptModule,
  SemanticSkillCard,
  PromptPreviewResponse,
  ChatCrm,
  ChatDraft,
  SendMessageResult,
  TenantWebhookIssued,
  ReplySupervisorStatus,
  EscalationAddressee,
  EscalationGroup,
  PartnerMe,
  PartnerMePatch,
  PartnerOverview,
  PartnerClientRowView,
  PartnerClientCard,
  PartnerTeam,
  PartnerAccruals,
  PartnerStatements,
  PartnerForecast,
  AdminPartner,
  AdminPartnerCreate,
  AdminPartnerPatch,
  AdminPartnerClientAttach,
  AdminPaymentCreate,
  AdminPayment,
  AdminPayout,
  BillingSettings,
  Tariff,
  TariffInput,
  BillingClient,
  BillingClientPatch,
  ClientInvoice,
  InvoiceCreate,
  InvoiceStatus,
} from "@/types";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "https://api.optima.altaiweb.online/api/v1/client";

// Normalize to correct API backend domain if missing api. subdomain
const API_BASE_URL = rawApiUrl.replace(
  /^https?:\/\/optima\.altaiweb\.online/,
  "https://api.optima.altaiweb.online"
);

const ADMIN_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/api/v1/admin");

// Session (#440): the API host sets an HttpOnly cookie at login, and every call goes out with
// `credentials: "include"`, so one login covers every dashboard host (my., partner. and the stage twins). No token is
// kept in the page. Only the chosen company stays in `localStorage` (not a secret).
// Rollout: a tab signed in before #440 still has `altai_token` in `localStorage`. It is sent once as a bearer to
// `/auth/me`, which answers with the cookie; then it is deleted (`dropLegacyToken`).
const LEGACY_TOKEN_KEY = "altai_token";
const TENANT_KEY = "altai_tenant";
let currentTenantId: string | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function legacyToken(): string | null {
  return storage()?.getItem(LEGACY_TOKEN_KEY) ?? null;
}

/** Forget the pre-#440 `localStorage` token once the cookie session has taken over. */
export function dropLegacyToken() {
  storage()?.removeItem(LEGACY_TOKEN_KEY);
}

/** Signed out: forget the company choice and any old token. */
export function clearStoredAuth() {
  currentTenantId = null;
  storage()?.removeItem(LEGACY_TOKEN_KEY);
  storage()?.removeItem(TENANT_KEY);
}

export function setSelectedTenant(tenantId: string) {
  currentTenantId = tenantId;
  storage()?.setItem(TENANT_KEY, tenantId);
}

export function clearSelectedTenant() {
  currentTenantId = null;
  storage()?.removeItem(TENANT_KEY);
}

export function getStoredAuth() {
  const tenantId = storage()?.getItem(TENANT_KEY) ?? currentTenantId;
  if (tenantId) currentTenantId = tenantId;
  return { tenantId };
}

/** Headers every API call carries: the company, the CSRF marker the API wants on cookie-session writes, and the old
 * bearer while a pre-#440 tab migrates. Use with `credentials: "include"`. */
export function sessionHeaders(): Record<string, string> {
  const { tenantId } = getStoredAuth();
  const headers: Record<string, string> = { "X-Requested-With": "altai" };
  const legacy = legacyToken();
  if (legacy) headers["Authorization"] = `Bearer ${legacy}`;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  return headers;
}

/** Partner portal API (`/api/v1/partner`), same host as the client API. */
const PARTNER_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/client\/?$/, "/api/v1/partner");

export { API_BASE_URL, ADMIN_API_BASE_URL, PARTNER_API_BASE_URL };

/** The backend may answer a list as a bare array or wrapped as `{ items: [...] }` (or a named key); accept both. */
function asList<T>(res: unknown, ...keys: string[]): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    for (const k of ["items", ...keys]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

/** Partner and billing routes: no tenant header, session only. */
function partnerRequest<T>(endpoint: string, options: RequestInit = {}) {
  return request<T>(endpoint, options, PARTNER_API_BASE_URL);
}

const ADMIN_PARTNERS = `${ADMIN_API_BASE_URL}`;
function adminRequest<T>(endpoint: string, options: RequestInit = {}) {
  return request<T>(endpoint, options, ADMIN_PARTNERS);
}

const jsonBody = (body: unknown) => ({ body: JSON.stringify(body) });

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = API_BASE_URL
): Promise<T> {
  const headers: Record<string, string> = {
    ...sessionHeaders(),
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const error: any = new Error(err.detail || `Ошибка сервера (${res.status})`);
    error.detail = err.detail || error.message;
    error.reason = err.reason;
    error.status = res.status;
    throw error;
  }

  return await res.json();
}

export const api = {
  async login(username_or_email: string, password: string, tenant_id?: string) {
    const res = await request<{
      ok: boolean;
      token: string;
      user: User;
      /** Absent or null for a partner account (no tenant). */
      tenant?: Tenant | null;
      permissions?: string[];
      allowed_employees?: string[];
      role?: string;
      available_tenants?: Array<{ id: string; business_name: string; is_active?: boolean }>;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username_or_email, password, tenant_id }),
    });
    dropLegacyToken();
    if (res.tenant?.id) setSelectedTenant(res.tenant.id);
    return res;
  },

  /** Own password change with the current one; every other session dies, this one gets the fresh token. */
  async changePassword(current_password: string, new_password: string) {
    const res = await request<{ ok: boolean; token?: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
    // The fresh session comes back as the cookie too.
    return res;
  },

  /** Revokes every session of the account on the server (#160); errors are ignored, the caller clears local state. */
  async logout() {
    try {
      await request<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } catch {
      /* already signed out or offline */
    }
  },

  async getMe() {
    return request<{
      ok: boolean;
      user: User;
      /** Absent or null for a partner account (no tenant). */
      tenant?: Tenant | null;
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
  } = {}): Promise<ChatsListResponse> {
    const q = new URLSearchParams();
    if (params.channel) q.append("channel", params.channel);
    if (params.status) q.append("status", params.status);
    if (params.search) q.append("search", params.search);
    if (params.limit) q.append("limit", String(params.limit));
    if (params.offset) q.append("offset", String(params.offset));

    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<ChatsListResponse>(`/chats${qs}`);
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

  async getBossChat() {
    return request<{ ok: boolean; messages: BossMessage[] }>("/boss-chat");
  },

  async sendBossMessage(text: string, files?: File[]) {
    if (files && files.length > 0) {
      const fd = new FormData();
      if (text) fd.append("text", text);
      files.forEach((f) => fd.append("files", f));
      return request<{ ok: boolean; messages: BossMessage[] }>("/boss-chat/message", {
        method: "POST",
        body: fd,
      });
    }
    return request<{ ok: boolean; messages: BossMessage[] }>("/boss-chat/message", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async pressBossButton(messageId: string, data: string) {
    return request<{ ok: boolean; toast: string; messages: BossMessage[] }>("/boss-chat/button", {
      method: "POST",
      body: JSON.stringify({ message_id: messageId, data }),
    });
  },

  async markChatRead(sessionId: string) {
    return request<{ ok: boolean }>(
      `/chats/${encodeURIComponent(sessionId)}/read`,
      { method: "POST" }
    ).catch(() => ({ ok: false }));
  },

  async takeChat(sessionId: string) {
    return request<{
      ok: boolean;
      owner?: { user_id?: string | null; name: string } | null;
      is_paused: boolean;
    }>(`/chats/${encodeURIComponent(sessionId)}/take`, {
      method: "POST",
    });
  },

  async releaseChat(sessionId: string) {
    return request<{ ok: boolean; owner: null }>(
      `/chats/${encodeURIComponent(sessionId)}/release`,
      { method: "POST" }
    );
  },

  async sendOperatorMessage(sessionId: string, text?: string, files?: File[]): Promise<SendMessageResult> {
    if (files && files.length > 0) {
      const fd = new FormData();
      if (text) fd.append("text", text);
      files.forEach((f) => fd.append("files", f));
      return request<SendMessageResult>(
        `/chats/${encodeURIComponent(sessionId)}/message`,
        {
          method: "POST",
          body: fd,
        }
      );
    }
    return request<SendMessageResult>(
      `/chats/${encodeURIComponent(sessionId)}/message`,
      {
        method: "POST",
        body: JSON.stringify({ text: text || "" }),
      }
    );
  },

  async sendDraft(sessionId: string, approvalId: string, scope?: "all" | "comment_only") {
    return request<{ ok: boolean; sent: boolean }>(
      `/chats/${encodeURIComponent(sessionId)}/draft/send`,
      {
        method: "POST",
        body: JSON.stringify({ approval_id: approvalId, scope }),
      }
    );
  },

  async regenerateDraft(sessionId: string, approvalId: string, note: string) {
    return request<{ ok: boolean }>(
      `/chats/${encodeURIComponent(sessionId)}/draft/regenerate`,
      {
        method: "POST",
        body: JSON.stringify({ approval_id: approvalId, note }),
      }
    );
  },

  async getChatCrm(sessionId: string, refresh?: boolean): Promise<ChatCrm | null> {
    try {
      const q = refresh ? "?refresh=1" : "";
      return await request<ChatCrm>(`/chats/${encodeURIComponent(sessionId)}/crm${q}`);
    } catch {
      return null;
    }
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

  // Escalation addressees and groups (#281, cap manage_users)
  async getEscalationAddressees(): Promise<{ ok: boolean; addressees: EscalationAddressee[] }> {
    return request("/escalation/addressees");
  },
  async createEscalationAddressee(data: {
    name: string;
    user_id?: string | null;
    group_ids?: string[];
    is_active?: boolean;
  }): Promise<{ ok: boolean; addressee: EscalationAddressee }> {
    return request("/escalation/addressees", { method: "POST", body: JSON.stringify(data) });
  },
  async updateEscalationAddressee(
    id: string,
    data: { name?: string; user_id?: string | null; group_ids?: string[]; is_active?: boolean }
  ): Promise<{ ok: boolean; addressee: EscalationAddressee }> {
    return request(`/escalation/addressees/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteEscalationAddressee(id: string): Promise<{ ok: boolean }> {
    return request(`/escalation/addressees/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async getEscalationGroups(): Promise<{ ok: boolean; groups: EscalationGroup[] }> {
    return request("/escalation/groups");
  },
  async createEscalationGroup(data: { name: string }): Promise<{ ok: boolean; group: EscalationGroup }> {
    return request("/escalation/groups", { method: "POST", body: JSON.stringify(data) });
  },
  async updateEscalationGroup(id: string, data: { name?: string }): Promise<{ ok: boolean; group: EscalationGroup }> {
    return request(`/escalation/groups/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteEscalationGroup(id: string): Promise<{ ok: boolean }> {
    return request(`/escalation/groups/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  ): Promise<{ ok: boolean; user?: TeamUser; token?: string }> {
    const res = await request<{ ok: boolean; user?: TeamUser; token?: string }>(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    // Own password change revokes every session, this one too; the backend sets a fresh session cookie (#160).
    return res;
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
    params: { search?: string; limit?: number; offset?: number; level?: string; since?: string; tenant_id?: string } = {}
  ): Promise<{ ok: boolean; resource: string; total: number; items: Record<string, any>[] }> {
    const q = new URLSearchParams();
    if (params.level) q.append("level", params.level);
    if (params.since) q.append("since", params.since);
    if (params.tenant_id) q.append("tenant_id", params.tenant_id);
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

  async revokeAdminChatLink(linkId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      `/chat-links/${encodeURIComponent(linkId)}/revoke`,
      { method: "POST" },
      ADMIN_API_BASE_URL
    );
  },

  /** Creates an inbound webhook of a company; the plaintext token is in the answer once. */
  async createAdminWebhook(
    tenantId: string,
    body: { name: string; description?: string; mode?: string }
  ): Promise<TenantWebhookIssued> {
    const res = await request<Omit<TenantWebhookIssued, "url">>(
      `/tenants/${encodeURIComponent(tenantId)}/webhooks`,
      { method: "POST", body: JSON.stringify(body) },
      ADMIN_API_BASE_URL
    );
    return { ...res, url: ADMIN_API_BASE_URL.replace(/\/api\/v1\/admin$/, "") + res.url_path };
  },

  /** New URL token of a webhook; the old URL stops working at once. */
  async rotateAdminWebhookToken(webhookId: string): Promise<TenantWebhookIssued> {
    const res = await request<Omit<TenantWebhookIssued, "url">>(
      `/webhooks/${encodeURIComponent(webhookId)}/rotate-token`,
      { method: "POST", body: JSON.stringify({}) },
      ADMIN_API_BASE_URL
    );
    return { ...res, url: ADMIN_API_BASE_URL.replace(/\/api\/v1\/admin$/, "") + res.url_path };
  },

  /** Reply supervisor of a company: kind, out-of-date flag and the changed KB node paths (#279). */
  async getReplySupervisorStatus(tenantId: string): Promise<ReplySupervisorStatus> {
    return request<ReplySupervisorStatus>(
      `/reply-supervisors/${encodeURIComponent(tenantId)}/status`,
      {},
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

  /** Uploads one KB photo or PDF file (no caption suggestion for PDFs). With `suggest` the server also asks a vision model for a caption (#414): the result's
   * `caption` is then the suggestion (empty when the model failed) and `suggested` is true when it was filled in. */
  async uploadKnowledgeMedia(
    file: File,
    opts?: string | { caption?: string; suggest?: boolean; note?: string; nodeTitle?: string; nodeText?: string },
  ): Promise<KbMediaItem & { suggested?: boolean }> {
    const o = typeof opts === "string" ? { caption: opts } : opts || {};
    const caption = o.caption;
    const headers = sessionHeaders();
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    if (o.suggest && !caption && file.type !== "application/pdf") {
      form.append("suggest_caption", "1");
      if (o.note) form.append("note", o.note);
      if (o.nodeTitle) form.append("node_title", o.nodeTitle);
      if (o.nodeText) form.append("node_text", o.nodeText);
    }
    const res = await fetch(`${API_BASE_URL}/knowledge/media`, {
      method: "POST",
      headers, // no Content-Type: the browser sets the multipart boundary
      body: form,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Ошибка сервера (${res.status})`);
    }
    const data = await res.json();
    const item = data.item as KbMediaItem;
    const suggestion = typeof data.suggested_caption === "string" ? data.suggested_caption.trim() : "";
    if (suggestion && !item.caption) return { ...item, caption: suggestion, suggested: true };
    return item;
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
    change_description?: string;
    actions_disposition?: KbActionsDisposition;
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

  async setKnowledgeNodeActive(nodeId: string, isActive: boolean): Promise<{ ok: boolean; node: KnowledgeNode }> {
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active: isActive }),
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

  async restoreKnowledgeNodeVersion(nodeId: string, versionId: number, tenantId?: string, actionsDisposition?: KbActionsDisposition): Promise<{
    ok: boolean;
    node: KnowledgeNode;
  }> {
    const qs = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/restore${qs}`, {
      method: "POST",
      body: JSON.stringify({ version_id: versionId, ...(actionsDisposition ? { actions_disposition: actionsDisposition } : {}) }),
    });
  },

  async getKnowledgeNodeActions(nodeId: string): Promise<{ ok: boolean; node_id: string; actions: KbNodeAction[] }> {
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/actions`);
  },

  async addKnowledgeNodeAction(nodeId: string, body: NewKbNodeAction): Promise<{ ok: boolean; action: KbNodeAction }> {
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/actions`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async cancelKnowledgeNodeAction(nodeId: string, actionId: string): Promise<{ ok: boolean; cancelled: boolean }> {
    return request(`/knowledge/nodes/${encodeURIComponent(nodeId)}/actions/${encodeURIComponent(actionId)}`, {
      method: "DELETE",
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

  // ==========================================================================
  // Partner portal (/api/v1/partner/*, root repo design/partners.md)
  // ==========================================================================

  async partnerMe(): Promise<PartnerMe> {
    return partnerRequest<PartnerMe>("/me");
  },
  async partnerUpdateMe(patch: PartnerMePatch): Promise<PartnerMe> {
    return partnerRequest<PartnerMe>("/me", { method: "PATCH", ...jsonBody(patch) });
  },
  async partnerOverview(): Promise<PartnerOverview> {
    return partnerRequest<PartnerOverview>("/overview");
  },
  async partnerClients(): Promise<PartnerClientRowView[]> {
    return asList<PartnerClientRowView>(await partnerRequest<unknown>("/clients"), "clients");
  },
  async partnerClient(tenantId: string): Promise<PartnerClientCard> {
    return partnerRequest<PartnerClientCard>(`/clients/${encodeURIComponent(tenantId)}`);
  },
  async partnerTeam(): Promise<PartnerTeam> {
    return partnerRequest<PartnerTeam>("/team");
  },
  async partnerAccruals(period?: string): Promise<PartnerAccruals> {
    const qs = period ? `?period=${encodeURIComponent(period)}` : "";
    return partnerRequest<PartnerAccruals>(`/accruals${qs}`);
  },
  async partnerStatements(): Promise<PartnerStatements> {
    return partnerRequest<PartnerStatements>("/statements");
  },
  async partnerForecast(): Promise<PartnerForecast> {
    return partnerRequest<PartnerForecast>("/forecast");
  },
  /** The partner's personal demo key (`dmk_...`, demo scope `own`); created on first read if missing. */
  async partnerDemoKey(): Promise<{ ok: boolean; key: string }> {
    return partnerRequest<{ ok: boolean; key: string }>("/demo-key");
  },
  /** Revokes the current demo key and returns a new one. */
  async partnerRegenerateDemoKey(): Promise<{ ok: boolean; key: string }> {
    return partnerRequest<{ ok: boolean; key: string }>("/demo-key/regenerate", { method: "POST" });
  },

  // ==========================================================================
  // Admin: partners (/api/v1/admin/partners/*)
  // ==========================================================================

  async adminListPartners(status?: string): Promise<AdminPartner[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return asList<AdminPartner>(await adminRequest<unknown>(`/partners${qs}`), "partners");
  },
  async adminCreatePartner(body: AdminPartnerCreate) {
    return adminRequest<unknown>("/partners", { method: "POST", ...jsonBody(body) });
  },
  /** An approved partner profile for an account that already exists (keeps its companies and password). */
  async adminEnableExistingPartner(body: Omit<AdminPartnerCreate, "username" | "email" | "password"> & { login: string }) {
    return adminRequest<unknown>("/partners/existing", { method: "POST", ...jsonBody(body) });
  },
  async adminUpdatePartner(userId: string, body: AdminPartnerPatch) {
    return adminRequest<unknown>(`/partners/${encodeURIComponent(userId)}`, { method: "PATCH", ...jsonBody(body) });
  },
  async adminAttachPartnerClient(body: AdminPartnerClientAttach) {
    return adminRequest<unknown>("/partners/clients", { method: "POST", ...jsonBody(body) });
  },
  async adminRecordPayment(body: AdminPaymentCreate) {
    return adminRequest<unknown>("/partners/payments", { method: "POST", ...jsonBody(body) });
  },
  async adminListPayments(tenantId: string): Promise<AdminPayment[]> {
    return asList<AdminPayment>(
      await adminRequest<unknown>(`/partners/payments?tenant_id=${encodeURIComponent(tenantId)}`),
      "payments"
    );
  },
  async adminClosePeriod(period: string) {
    return adminRequest<unknown>(`/partners/periods/${encodeURIComponent(period)}/close`, { method: "POST" });
  },
  async adminListPayouts(): Promise<AdminPayout[]> {
    return asList<AdminPayout>(await adminRequest<unknown>("/partners/payouts"), "payouts");
  },
  async adminMarkPayoutPaid(payoutId: string) {
    return adminRequest<unknown>(`/partners/payouts/${encodeURIComponent(payoutId)}/paid`, { method: "POST" });
  },

  // ==========================================================================
  // Admin: billing (/api/v1/admin/billing/*)
  // ==========================================================================

  async adminGetBillingSettings(): Promise<BillingSettings> {
    return adminRequest<BillingSettings>("/billing/settings");
  },
  async adminPutBillingSettings(body: Partial<BillingSettings>) {
    return adminRequest<unknown>("/billing/settings", { method: "PUT", ...jsonBody(body) });
  },
  async adminListTariffs(): Promise<Tariff[]> {
    return asList<Tariff>(await adminRequest<unknown>("/billing/tariffs"), "tariffs");
  },
  async adminCreateTariff(body: TariffInput) {
    return adminRequest<unknown>("/billing/tariffs", { method: "POST", ...jsonBody(body) });
  },
  async adminUpdateTariff(id: string, body: Partial<TariffInput>) {
    return adminRequest<unknown>(`/billing/tariffs/${encodeURIComponent(id)}`, { method: "PATCH", ...jsonBody(body) });
  },
  async adminListBillingClients(): Promise<BillingClient[]> {
    return asList<BillingClient>(await adminRequest<unknown>("/billing/clients"), "clients");
  },
  async adminPutBillingClient(tenantId: string, body: BillingClientPatch) {
    return adminRequest<unknown>(`/billing/clients/${encodeURIComponent(tenantId)}`, { method: "PUT", ...jsonBody(body) });
  },
  async adminListInvoices(params: { tenant_id?: string; status?: InvoiceStatus | "" } = {}): Promise<ClientInvoice[]> {
    const q = new URLSearchParams();
    if (params.tenant_id) q.set("tenant_id", params.tenant_id);
    if (params.status) q.set("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return asList<ClientInvoice>(await adminRequest<unknown>(`/billing/invoices${qs}`), "invoices");
  },
  async adminCreateInvoice(body: InvoiceCreate) {
    return adminRequest<unknown>("/billing/invoices", { method: "POST", ...jsonBody(body) });
  },
  async adminMarkInvoicePaid(id: string, paidAt?: string) {
    return adminRequest<unknown>(`/billing/invoices/${encodeURIComponent(id)}/paid`, {
      method: "POST",
      ...jsonBody(paidAt ? { paid_at: paidAt } : {}),
    });
  },
  async adminCancelInvoice(id: string) {
    return adminRequest<unknown>(`/billing/invoices/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  },
  /** The printable счёт is HTML behind the session: fetch it with the cookie and show it from a blob URL. */
  async adminOpenInvoiceHtml(id: string): Promise<void> {
    // Open the tab synchronously (popup blockers), fill it after the fetch.
    const win = window.open("", "_blank");
    try {
      const res = await fetch(`${ADMIN_API_BASE_URL}/billing/invoices/${encodeURIComponent(id)}/html`, {
        headers: sessionHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Ошибка сервера (${res.status})`);
      const html = await res.text();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (e) {
      win?.close();
      throw e;
    }
  },
};
