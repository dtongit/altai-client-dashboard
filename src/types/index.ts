export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  role: "superadmin" | "client_admin" | "client_operator" | "tester";
  tenant_id: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  is_active: boolean;
  crm_type: string;
  llm_model: string;
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
  created_at: string;
  updated_at: string;
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

export type ChannelWorkMode = "stop" | "hitl" | "auto";

export interface InstagramStatus {
  ok: boolean;
  tenant_id: string;
  configured: boolean;
  enabled: boolean;
  mode?: ChannelWorkMode;
  require_approval?: boolean;
  supervisor_chat_id?: string;
  has_token: boolean;
  masked_token?: string;
  user_id?: number;
  user_name?: string;
  instagram_login?: string;
  reply_to_comments?: boolean;
  webhook_url: string;
  webhook_id?: number;
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
// Employee Configurator & Custom JS Sandbox Tools Types
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

export interface ConfiguratorActionResult {
  action: "update_prompt" | "upsert_custom_tool" | "toggle_custom_tool" | "upsert_secret" | "run_sandbox_test" | string;
  action_type?: string;
  status?: string;
  title?: string;
  summary?: string;
  new_version?: number;
  version?: number;
  change_description?: string;
  diff?: string;
  diff_preview?: string;
  tool_name?: string;
  tool_id?: string;
  key_name?: string;
  sandbox_test?: SandboxExecutionResult;
}

export interface ConfiguratorChatResponse {
  ok: boolean;
  reply?: string;
  response?: string;
  actions_executed?: ConfiguratorActionResult[];
  actions?: ConfiguratorActionResult[];
  prompt_updated?: boolean;
  tools_updated?: boolean;
  secrets_updated?: boolean;
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
  media_attachments?: Array<{ type: string; url: string; caption?: string }>;
  high_confidence_triggers?: string[];
  allowed_employees?: string[];
  allowed_roles?: string[];
  valid_from?: string | null;
  valid_until?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  tenant_id: string;
  sku: string;
  title: string;
  category?: string | null;
  description?: string | null;
  base_price_rub?: number | null;
  currency: string;
  attributes?: Record<string, any>;
  media_urls?: string[];
  is_active: boolean;
  updated_at: string;
}

export interface CatalogInventory {
  id: string;
  tenant_id: string;
  sku: string;
  variant_key: string;
  is_available: boolean;
  quantity?: number | null;
  source: string;
  last_synced_at: string;
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



