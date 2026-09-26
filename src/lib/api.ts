import {
  ChatDetail,
  ChatSessionItem,
  KnowledgeResponse,
  OverviewData,
  SystemStatusResponse,
  User,
  Tenant,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/client";

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

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    // If backend is unreachable or local development offline, use mock demo data
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("ECONNREFUSED")
    ) {
      return getMockFallback<T>(endpoint, options);
    }
    throw err;
  }
}

export const api = {
  async login(username_or_email: string, password: string, tenant_id?: string) {
    try {
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
    } catch {
      // Fallback demo login
      const demoUser: User = {
        id: "demo_usr_01",
        username: username_or_email || "tallora_admin",
        email: "director@tallora.ru",
        is_admin: false,
        role: "client_admin",
        tenant_id: tenant_id || "client_tallora",
      };
      const demoTenant: Tenant = {
        id: tenant_id || "client_tallora",
        business_name: "Бренд премиальной обуви Tallora",
        is_active: true,
        crm_type: "amocrm",
        llm_model: "deepseek/deepseek-chat",
      };
      setAuthToken("demo_jwt_token_active", demoTenant.id);
      return {
        ok: true,
        token: "demo_jwt_token_active",
        user: demoUser,
        tenant: demoTenant,
      };
    }
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
};

// ============================================================================
// High-Fidelity Mock Fallback for Demo & Local Standalone Review
// ============================================================================

function getMockFallback<T>(endpoint: string, options: RequestInit = {}): T {
  if (endpoint.startsWith("/overview")) {
    return {
      ok: true,
      tenant_id: "client_tallora",
      business_name: "Бренд обуви Tallora",
      system_status: {
        is_active: true,
        paused_chats_count: 1,
        paused_sessions: ["client_tallora:telegram:cust_442"],
      },
      kpis: {
        total_messages: 1428,
        total_conversations: 382,
        today_messages: 89,
        today_conversations: 24,
        qualified_leads: 134,
        conversion_rate_pct: 35.1,
        average_latency_ms: 1840,
        total_tokens: 384020,
        estimated_cost_rub: 115.2,
        estimated_payroll_saved_rub: 68760,
      },
      channel_breakdown: {
        telegram: 184,
        whatsapp: 142,
        web: 56,
      },
      daily_timeline: [
        { date: "2026-09-20", messages: 184, conversations: 42 },
        { date: "2026-09-21", messages: 210, conversations: 51 },
        { date: "2026-09-22", messages: 195, conversations: 48 },
        { date: "2026-09-23", messages: 228, conversations: 57 },
        { date: "2026-09-24", messages: 245, conversations: 62 },
        { date: "2026-09-25", messages: 277, conversations: 71 },
        { date: "2026-09-26", messages: 89, conversations: 24 },
      ],
    } as unknown as T;
  }

  if (endpoint.startsWith("/chats?")) {
    return {
      ok: true,
      total: 4,
      chats: [
        {
          session_id: "client_tallora:telegram:cust_442",
          channel: "telegram",
          user_id: "cust_442",
          turn_count: 5,
          last_message: "Здравствуйте! Хочу примерить лоферы AIDA 41 размера в шоуруме",
          last_activity: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          last_status: "paused_takeover",
          is_paused: true,
          is_qualified: true,
          qualification: {
            client_name: "Екатерина",
            client_phone: "+7 (926) 450-11-22",
            need_description: "Лоферы AIDA, размер 41 (длина стопы 27 см)",
            budget_rub: 24500,
            is_qualified: true,
          },
          crm_info: "AMOCRM #448912",
        },
        {
          session_id: "client_tallora:whatsapp:cust_559",
          channel: "whatsapp",
          user_id: "cust_559",
          turn_count: 4,
          last_message: "Спасибо, оплатила по ссылке Долями!",
          last_activity: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          last_status: "success",
          is_paused: false,
          is_qualified: true,
          qualification: {
            client_name: "Анастасия",
            client_phone: "+7 (916) 880-33-44",
            need_description: "Балетки Allora Черная кожа, 40 размер",
            budget_rub: 18900,
            is_qualified: true,
          },
          crm_info: "AMOCRM #448908",
        },
        {
          session_id: "client_tallora:web:cust_701",
          channel: "web",
          user_id: "cust_701",
          turn_count: 2,
          last_message: "Подскажите, отправляете ли СДЭКом в Санкт-Петербург?",
          last_activity: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
          last_status: "success",
          is_paused: false,
          is_qualified: false,
          qualification: null,
          crm_info: null,
        },
        {
          session_id: "client_tallora:telegram:cust_814",
          channel: "telegram",
          user_id: "cust_814",
          turn_count: 3,
          last_message: "Интересуют ботильоны на широкую голень 42 размер",
          last_activity: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          last_status: "success",
          is_paused: false,
          is_qualified: true,
          qualification: {
            client_name: "Мария С.",
            client_phone: "+7 (903) 777-12-34",
            need_description: "Ботильоны, 42 размер, высокий подъем",
            budget_rub: 29000,
            is_qualified: true,
          },
          crm_info: "AMOCRM #448880",
        },
      ],
    } as unknown as T;
  }

  if (endpoint.startsWith("/chats/")) {
    const isPaused = endpoint.includes("cust_442");
    return {
      ok: true,
      session_id: "client_tallora:telegram:cust_442",
      tenant_id: "client_tallora",
      channel: "telegram",
      user_id: "cust_442",
      is_paused: isPaused,
      turns_count: 3,
      qualification: {
        client_name: "Екатерина",
        client_phone: "+7 (926) 450-11-22",
        need_description: "Лоферы AIDA, размер 41 (длина стопы 27 см)",
        budget_rub: 24500,
        is_qualified: true,
        urgency: "высокая (примерка на этой неделе)",
      },
      crm_result: {
        crm_type: "amocrm",
        success: true,
        lead_id: "448912",
      },
      turns: [
        {
          turn_index: 1,
          id: "turn_1",
          created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          user_message: "Здравствуйте! Подскажите, есть ли лоферы AIDA на стопу 27 см?",
          assistant_response: "Здравствуйте, Екатерина! Благодарю за интерес к Tallora. Стопе 27 см идеально соответствует наш 41 размер в колодке AIDA. Лоферы выполнены из итальянской кожи шевро, очень мягкие и комфортные с первой примерки. В наличии на складе в Москве есть классический черный и шоколадный цвета. Подсказать условия примерки?",
          status: "success",
          latency_ms: 1720,
          tokens: 412,
        },
        {
          turn_index: 2,
          id: "turn_2",
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          user_message: "Да, можно примерить в шоуруме в Москве? Мой номер +7 (926) 450-11-22",
          assistant_response: "Отлично, зафиксировала ваш контакт! Наш уютный шоурум находится в Москве, метро Маяковская. Менеджер уже готовит пару 41 размера к вашему визиту и свяжется для подтверждения удобного времени.",
          status: "success",
          latency_ms: 1890,
          tokens: 388,
        },
        {
          turn_index: 3,
          id: "turn_3",
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          user_message: "А если не подойдет по ширине, можно будет сразу 42 померить?",
          assistant_response: isPaused ? null : "Конечно! Мы отложим для вас две смежные пары — 41 и 42, чтобы вы выбрали идеальную посадку.",
          status: isPaused ? "paused_takeover" : "success",
          latency_ms: isPaused ? 0 : 1650,
          tokens: isPaused ? 0 : 340,
        },
      ],
    } as unknown as T;
  }

  if (endpoint.startsWith("/system/status")) {
    return {
      ok: true,
      tenant_id: "client_tallora",
      business_name: "Бренд обуви Tallora",
      is_active: true,
      paused_chats_count: 1,
      crm: {
        type: "amocrm",
        configured: true,
      },
      channels: [
        { name: "Telegram Bot", type: "telegram", configured: true, detail: "@tallora_sdr_bot подключен" },
        { name: "WhatsApp Green-API", type: "whatsapp", configured: true, detail: "Инстанс 110182390 активен" },
        { name: "Веб-виджет Tilda", type: "web", configured: true, detail: "tallora.ru подключен" },
      ],
    } as unknown as T;
  }

  if (endpoint.startsWith("/knowledge")) {
    return {
      ok: true,
      tenant_id: "client_tallora",
      profile: `# Бренд обуви Tallora\n\nПремиальная женская обувь больших размеров (36-43). Специальные колодки для высоких девушек.\nСервис уровня Ritz-Carlton, заботливое и уважительное отношение к каждой клиентке.`,
      pricing: `# Каталог и цены\n\n- Лоферы AIDA (кожа шевро): 24 500 ₽\n- Балетки Allora (кожа/замша): 18 900 ₽\n- Босоножки Riviera: 16 800 ₽\n- Ботильоны Grace: 29 000 ₽`,
      objections: `# Отработка возражений\n\n- «Вдруг размер не подойдет»: примерка 2-х смежных пар курьером СДЭК или в шоуруме.\n- «Дорого»: итальянская кожа шевро, ручная сборка, гарантия 1 год.`,
    } as unknown as T;
  }

  return { ok: true } as unknown as T;
}
