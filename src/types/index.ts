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

export interface OverviewData {
  ok: boolean;
  tenant_id: string;
  business_name: string;
  system_status: SystemStatus;
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
  };
  channels: ChannelStatus[];
}

export interface KnowledgeResponse {
  ok: boolean;
  tenant_id: string;
  profile: string;
  pricing: string;
  objections: string;
}
