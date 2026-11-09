export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  /** Global demo-manager flag (spec M4); absent on old backends, then `role === "demo_manager"`. */
  is_demo_manager?: boolean;
  /** Normalized by the backend: superadmin | manager | employee | demo_manager. Old backends send client_admin etc. */
  role?: "demo_manager" | "superadmin" | "manager" | "employee" | "client_admin" | "client_operator" | "tester" | (string & {});
  /** Default tenant after login only; access comes from memberships (tenant_memberships). */
  tenant_id?: string;
  /** Columns added by roles epic #75 (/admin users rows). */
  permissions?: UserPermissionOverrides | Record<string, never>;
  ai_employee_scope?: "all" | "selected";
  created_by?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
}

/** Capability ids of the roles epic (#75). */
export type Cap =
  | "master_switch"
  | "settings"
  | "instructions"
  | "manage_users"
  | "audit_log"
  | "alerts"
  | "bot_changes";

/** `users.permissions`: per-user overrides on top of the role preset. */
export interface UserPermissionOverrides {
  grant?: Cap[];
  revoke?: Cap[];
}

/** Row of /admin/crud/user-employee-access. */
export interface UserEmployeeAccess {
  user_id: string;
  tenant_id: string;
  employee_id: string;
  created_at: string;
}

/** Row of /admin/crud/audit-log (read-only) and item of GET /audit-log. */
export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  actor_type: "user" | "system" | "bot" | (string & {});
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  target: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

/** Row of /admin/crud/tenant-memberships (multi-tenant accounts, epic #324). */
export interface TenantMembership {
  user_id: string;
  tenant_id: string;
  /** JSON array of Cap ids. */
  permissions: Cap[] | string;
  /** JSON array of AI employee ids, or "*" for all. */
  employee_ids: string[] | string;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Item of GET /users: one membership of the current company. */
export interface TeamUser {
  id: string;
  username: string;
  email: string | null;
  /** Account status (global). */
  is_active: boolean;
  is_admin?: false;
  membership: {
    permissions: Cap[];
    /** "*" = all AI employees (including later ones). */
    employee_ids: "*" | string[];
    is_active: boolean;
  };
  /** Linked Telegram member, if any. Field names are read defensively. */
  telegram?: {
    member_id?: string;
    username?: string | null;
    telegram_username?: string | null;
    display_name?: string | null;
    bot_username?: string | null;
  } | null;
}

export interface Tenant {
  id: string;
  business_name: string;
  is_active: boolean;
  crm_type: string;
  llm_model: string;
  /** "live" (default) or "demo" (read-only tools, managed with demo keys). */
  kind?: "live" | "demo";
  /** Autopilot can be chosen only when true (set by the superadmin). */
  ready_for_auto?: boolean;
}

/** Row of /admin/crud/api-keys (the hash is never returned). */
export interface AdminApiKey {
  id: string;
  name: string;
  scope: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export interface OverviewKPIs {
  total_messages: number;
  total_conversations: number;
  today_messages: number;
  today_conversations: number;
  qualified_leads: number;
  conversion_rate_pct: number;
  average_latency_ms: number;
  total_tokens: number;
  estimated_cost_rub: number;
  estimated_payroll_saved_rub: number;
}

export interface SystemStatus {
  is_active: boolean;
  paused_chats_count: number;
  paused_sessions: string[];
}

export interface TelegramBotInfo {
  bot_username: string;
  bot_url: string;
  has_subscribers: boolean;
  subscribers_count: number;
  subscribers?: Array<{
    chat_id?: string;
    username?: string;
    first_name?: string;
    id?: string;
  }>;
}

export interface TeamMember {
  id: string;
  tenant_id: string;
  telegram_user_id: string;
  telegram_username?: string | null;
  display_name: string;
  role: "senior" | "manager" | "viewer" | string;
  can_modify_instructions: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;
  is_active: boolean;
  /** Linked dashboard user (roles epic #75); null/absent = legacy unlinked member. */
  user_id?: string | null;
  /** Team bot the member talks to: "default" or "tenant:{tenant_id}" (row of tenant_team_members, #324). */
  bot_id?: string;
  created_at: string;
  updated_at: string;
}

/** Superadmin team-bot state of a tenant (POST/DELETE /api/v1/admin/tenants/{id}/team-bot). */
export interface TeamBotAdminResponse {
  ok: boolean;
  bot_id?: string;
  username?: string | null;
  webhook_url?: string;
  detail?: string;
}

export interface TeamInviteResponse {
  ok: boolean;
  token: string;
  role: string;
  bot_username: string;
  invite_url: string;
  expires_in: number;
}

export interface TeamMembersResponse {
  ok: boolean;
  bot_username: string;
  members: TeamMember[];
}

export type ChannelMode = "off" | "hitl" | "auto";

/** `active`, `blocked` or another Umnico status, `not_connected`, `unknown` (Umnico unreachable). */
export type ChannelLineStatus = "active" | "not_connected" | "unknown" | (string & {});

export interface ChannelItem {
  id: string;
  mode: ChannelMode;
  wanted: boolean;
  connected: boolean;
  line_status: ChannelLineStatus;
  identity?: string | null;
  provider?: string | null;
}

export interface ChannelsResponse {
  ok: boolean;
  auto_allowed: boolean;
  channels: ChannelItem[];
}

export interface SetChannelModeResponse {
  ok: boolean;
  id?: string;
  mode: ChannelMode;
  [key: string]: unknown;
}

export interface UmnicoLine {
  type: string;
  status: string;
}

export interface UmnicoStatus {
  connected: boolean;
  lines: UmnicoLine[];
  // Superadmin only (is_admin):
  masked_token?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  webhook_id?: number | null;
  webhook_url?: string | null;
}

export interface TeamBotLogEvent {
  id: string;
  tenant_id: string;
  telegram_user_id: string;
  telegram_username?: string | null;
  display_name?: string | null;
  event_type: "dialog" | "button_click" | "system_alert" | "command" | "guest_attempt" | string;
  direction: "inbound" | "outbound" | "both" | string;
  user_message?: string | null;
  bot_response?: string | null;
  event_payload?: Record<string, any> | null;
  llm_provider?: string | null;
  llm_model?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  estimated_cost_rub?: number | null;
  total_latency_ms?: number | null;
  tools_executed?: string[] | any;
  created_at: string;
}

/** Row of /admin/crud/team-bot-messages (#309): a team-bot message a member can reply to, read-only. */
export interface TeamBotMessage {
  id: string;
  tenant_id: string;
  telegram_user_id: string;
  chat_id: string;
  /** Telegram message id; null when not known (test mode, failed send). */
  message_id: number | null;
  kind: "alert" | "ask" | "ask_result" | "changeset_card" | "changeset_notice" | "reminder" | "undo_prompt" | "agent_reply" | string;
  /** Chat session id (alert), ask id (ask) or changeset id (cards, reminders). */
  ref_id: string | null;
  text: string;
  created_at: string;
}

/** Row of /admin/crud/team-trace-steps and a step in the team-bot trace (read-only debug trace of a turn). */
export interface TeamTraceStep {
  id: string;
  tenant_id: string;
  telegram_user_id: string;
  turn_id: string | null;
  seq: number;
  kind: "prompt" | "llm" | "tool" | "reviewer" | "changeset" | string;
  model: string | null;
  input: any;
  output: any;
  prompt_tokens: number;
  completion_tokens: number;
  cost_rub: number;
  latency_ms: number;
  error: string | null;
  changeset_id: string | null;
  created_at: string;
  /** Only on `changeset` steps in the trace API: the changeset as it is now (edits with diffs). */
  changeset?: {
    id: string;
    status: string;
    summary: string;
    requester_name: string;
    reviewer_verdict: string | null;
    review_rounds: number;
    failure_reason: string | null;
    edits: Array<{ description: string; targets: string[]; diff: string }>;
  } | null;
}

export interface TeamTraceModelTotals {
  model: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_rub: number;
}

/** A turn of the trace: the `team_bot_logs` row plus its ordered steps. */
export interface TeamTraceTurn extends TeamBotLogEvent {
  type: "turn";
  turn_id: string | null;
  has_trace: boolean;
  has_error: boolean;
  trace_totals: {
    llm_calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    cost_rub: number;
    models: TeamTraceModelTotals[];
  };
  steps: TeamTraceStep[];
}

/** A changeset transition outside a turn (button press, undo, expiry). */
export interface TeamTraceEvent extends TeamTraceStep {
  type: "changeset_event";
}

export interface TeamTraceResponse {
  ok: boolean;
  telegram_user_id: string;
  tenant_id?: string | null;
  totals: {
    turns: number;
    llm_calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    cost_rub: number;
    models: TeamTraceModelTotals[];
  };
  items: Array<TeamTraceTurn | TeamTraceEvent>;
}

export interface TeamBotConversation {
  telegram_user_id: string;
  display_name: string;
  role?: string;
  tenant_id?: string;
  telegram_username?: string;
  total_events: number;
  last_event_time: string;
  last_event_type: string;
  last_message: string;
}

export interface OverviewData {
  ok: boolean;
  tenant_id: string;
  business_name: string;
  system_status: SystemStatus;
  telegram_bot?: TelegramBotInfo;
  kpis: OverviewKPIs;
  channel_breakdown: Record<string, number>;
  daily_timeline: Array<{
    date: string;
    messages: number;
    conversations: number;
  }>;
}

export interface ChatSessionItem {
  session_id: string;
  channel: "telegram" | "whatsapp" | "web" | string;
  user_id: string;
  turn_count: number;
  last_message: string;
  last_activity: string | null;
  last_status: string;
  is_paused: boolean;
  is_qualified: boolean;
  qualification: {
    client_name?: string | null;
    client_phone?: string | null;
    need_description?: string | null;
    budget_rub?: number | null;
    is_qualified?: boolean;
  } | null;
  crm_info?: string | null;
}

export interface ChatTurn {
  turn_index: number;
  id: string;
  created_at: string | null;
  user_message: string | null;
  assistant_response: string | null;
  status: string;
  latency_ms: number | null;
  tokens: number;
  role?: "user" | "assistant" | "operator" | "system";
}

export interface ChatDetail {
  ok: boolean;
  session_id: string;
  tenant_id: string;
  channel: string;
  user_id: string;
  is_paused: boolean;
  turns_count: number;
  qualification: {
    client_name?: string | null;
    client_phone?: string | null;
    need_description?: string | null;
    budget_rub?: number | null;
    is_qualified?: boolean;
    urgency?: string | null;
  } | null;
  crm_result?: {
    crm_type?: string;
    success?: boolean;
    lead_id?: string | number | null;
  } | null;
  turns: ChatTurn[];
}

export interface ChannelStatus {
  name: string;
  type: string;
  configured: boolean;
  detail: string;
}

export interface SystemStatusResponse {
  ok: boolean;
  tenant_id: string;
  business_name: string;
  is_active: boolean;
  paused_chats_count: number;
  crm: {
    type: string;
    configured: boolean;
    url?: string | null;
  };
  channels: ChannelStatus[];
  telegram_bot?: TelegramBotInfo;
}

export interface KnowledgeResponse {
  ok: boolean;
  tenant_id: string;
  profile: string;
  pricing: string;
  objections: string;
  raw_markdown?: string;
  versions?: PromptVersionItem[];
}

export interface SimulatorMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  created_at?: string | null;
  latency_ms?: number | null;
  /** System note instead of a reply from Vera (escalation, #142). */
  technical?: boolean;
}

export interface SimulatorQualification {
  client_name?: string | null;
  client_phone?: string | null;
  need_description?: string | null;
  budget_rub?: number | null;
  is_qualified?: boolean;
  urgency?: string | null;
}

export interface SimulatorResponse {
  ok: boolean;
  session_id: string;
  response: string;
  /** `response` is a system note, not a reply from Vera. */
  technical?: boolean;
  latency_ms: number;
  status: string;
  qualification: SimulatorQualification;
}

export interface SimulatorHistoryResponse {
  ok: boolean;
  session_id: string;
  messages: SimulatorMessage[];
  qualification: SimulatorQualification;
}

// ============================================================================
// Employee config & Custom JS Sandbox Tools Types
// ============================================================================

export interface PromptVersionItem {
  version: number;
  content?: string;
  author: string;
  change_description: string;
  created_at: string | null;
}

export interface CustomToolItem {
  id: string;
  tenant_id: string;
  employee_id: string;
  name: string;
  description: string;
  parameters_schema: Record<string, any>;
  runtime: string;
  code: string;
  version?: number;
  current_version?: number;
  is_active: boolean;
  timeout_ms?: number;
  group_slug?: string;
  group_name?: string;
  prompt_rules?: string | null;
  last_test_status?: string | null;
  last_test_output?: SandboxExecutionResult | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface CustomToolVersionItem {
  id: number;
  tool_id: string;
  version: number;
  code: string;
  parameters_schema: Record<string, any>;
  author?: string | null;
  change_description?: string | null;
  created_at?: string | null;
}

export interface TenantSecretItem {
  id: number;
  key_name: string;
  masked_value: string;
  updated_at?: string | null;
}

export interface SandboxExecutionResult {
  ok: boolean;
  result?: any;
  logs?: string[];
  duration_ms?: number;
  memory_kb?: number;
  error?: string | null;
  sandbox_mode?: string;
}

export interface EmployeeConfigResponse {
  ok: boolean;
  tenant_id: string;
  business_name: string;
  employee: {
    id: string;
    name: string;
    role: string;
    is_active: boolean;
    llm_model: string;
  };
  prompt: {
    raw_markdown: string;
    versions: PromptVersionItem[];
  };
  custom_tools: CustomToolItem[];
  secrets: TenantSecretItem[];
}

// ============================================================================
// Superadmin CRUD Console (SQLAdmin Replacement) Types
// ============================================================================

export interface AdminCrudResourceSchema {
  resource: string;
  label: string;
  icon: string;
  primary_key: string;
  read_only?: boolean;
  columns: string[];
}

/** Row of /admin/crud/context-changesets (read-only: proposals of the team bot, #138). */
export interface AdminContextChangeset {
  id: string;
  tenant_id: string;
  requester_member_id: string;
  requester_tg_id: string;
  requester_name: string;
  status: "draft" | "in_review" | "awaiting_confirm" | "applied" | "rejected" | "expired" | "rolled_back" | "failed" | "superseded";
  summary: string;
  /** Typed edits with base_version and diff. */
  edits: Record<string, any>[];
  reviewer_verdict: string | null;
  reviewer_reasons: string[];
  review_rounds: number;
  failure_reason: string | null;
  applied_by: string | null;
  applied_versions: Record<string, any>[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
}

export interface AdminLLMStep {
  step: string;
  model?: string;
  provider?: string;
  ttft_ms?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  has_tool_calls?: boolean;
  content_preview?: string;
  request_messages?: Array<{
    role: string;
    content: string;
    [key: string]: any;
  }>;
  response_content?: string;
}

export interface AdminToolExecution {
  tool: string;
  mode?: string;
  arguments: Record<string, any> | any;
  output: Record<string, any> | any;
}

export interface AdminInteractionLogTurn {
  id: string;
  tenant_id: string;
  session_id: string;
  channel: string;
  user_id: string;
  user_message: string | null;
  assistant_response: string | null;
  status: string;
  llm_provider: string;
  llm_model: string;
  total_latency_ms: number | null;
  ttft_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_rub: number;
  tools_executed: AdminToolExecution[];
  llm_steps: AdminLLMStep[];
  error_type?: string | null;
  error_message?: string | null;
  stack_trace?: string | null;
  created_at: string;
}

export interface AdminChatTraceResponse {
  ok: boolean;
  session_id: string;
  tenant_id: string;
  tenant_business_name?: string;
  channel: string;
  user_id: string;
  turn_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_rub: number;
  turns: AdminInteractionLogTurn[];
}

// ============================================================================
// DYNAMIC KNOWLEDGE BASE & CATALOG & MODULAR PROMPTS
// ============================================================================

/** Photo attached to a KB node (uploaded to storage or added by https link). */
export interface KbMediaItem {
  id?: string;
  url: string;
  caption?: string;
  type?: string;
}

export interface KnowledgeNode {
  id: string;
  tenant_id: string;
  path: string;
  parent_path?: string | null;
  title: string;
  node_type: string;
  tier: "L0" | "L1" | "L2" | string;
  summary: string;
  content: string;
  media_attachments?: KbMediaItem[];
  high_confidence_triggers?: string[];
  allowed_employees?: string[];
  allowed_roles?: string[];
  valid_from?: string | null;
  valid_until?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Deleted KB node (newest tombstone, no live node at that path). */
export interface DeletedKnowledgeNode {
  node_id: string;
  version_id: number;
  path: string | null;
  title: string;
  tier?: string | null;
  summary: string;
  deleted_by?: string | null;
  deleted_at: string;
}

export interface KnowledgeNodeVersion {
  id: number;
  node_id: string;
  tenant_id: string;
  version: number;
  summary: string;
  content: string;
  author?: string | null;
  change_description?: string | null;
  created_at: string;
  path?: string | null;
  /** Full node state after this change; null on legacy rows. */
  snapshot?: Record<string, unknown> | null;
  /** upsert | toggle | delete | restore | baseline | seed; null on legacy rows. */
  change_kind?: string | null;
  /** Tombstone: this change deleted the node. */
  is_deleted: boolean;
}

export interface PromptModule {
  id: string;
  scope: "global" | "tenant";
  tenant_id?: string | null;
  slug: string;
  name: string;
  category: string;
  override_mode: "replace" | "append" | "prepend" | "disabled" | string;
  priority_order: number;
  allowed_employees?: string[];
  allowed_roles?: string[];
  allowed_channels?: string[];
  case_tags?: string[];
  content: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TenantSecretMasked {
  id: number;
  tenant_id: string;
  key_name: string;
  is_set: boolean;
  group_slug: string;
  group_name: string;
  description?: string | null;
  updated_at: string;
}

export interface SemanticSkillCard {
  group_slug: string;
  group_name: string;
  prompt_rules: string;
  tools: CustomToolItem[];
  secrets: TenantSecretMasked[];
}

export interface PromptPreviewResponse {
  ok: boolean;
  tenant_id: string;
  employee: string;
  role: string;
  channel: string;
  assembled_prompt: string;
  character_count: number;
  lines_count: number;
}




/** Подключение Telegram Business к аккаунту клиента (#109). Админ-ресурс `tg-business-connections`, только чтение. */
export interface TgBusinessConnection {
  connection_id: string;
  tenant_id: string;
  owner_user_id: string;
  can_reply: boolean;
  is_enabled: boolean;
  updated_at?: string | null;
}

/** Карточка лида: что Vera узнала о клиенте в чате (#265). Админ-ресурс `lead-cards`, только чтение. */
export interface LeadCard {
  session_id: string;
  tenant_id: string;
  channel: string;
  user_id: string;
  /** Свободные факты о клиенте: имя, телефон, потребность и поля тенанта. */
  fields: Record<string, unknown>;
  qualified: boolean;
  qualified_rule?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
