import type { Cap, User } from "@/types";

export const ALL_CAPS: Cap[] = [
  "master_switch",
  "settings",
  "instructions",
  "manage_users",
  "audit_log",
  "alerts",
  "bot_changes",
];

export const CAP_LABELS: Record<Cap, { title: string; hint: string }> = {
  master_switch: { title: "Пауза и запуск Веры", hint: "Выключатель Веры в шапке и в Telegram-боте" },
  settings: { title: "Выключатели каналов", hint: "Режимы каналов, Umnico, подключение Telegram" },
  instructions: { title: "Инструкции для Веры", hint: "База знаний, промпты и навыки" },
  manage_users: { title: "Команда и доступы", hint: "Создавать сотрудников и менять их права" },
  audit_log: { title: "Журнал действий", hint: "Просмотр журнала действий" },
  alerts: { title: "Уведомления", hint: "Получает эскалации и вопросы Веры в Telegram" },
  bot_changes: { title: "Правки через бота", hint: "Просить Веру изменить базу знаний в Telegram" },
};

export type RoleId = "superadmin" | "manager" | "employee" | "demo_manager";

export const ROLE_LABELS: Record<string, string> = {
  superadmin: "Суперадмин",
  manager: "Менеджер",
  employee: "Сотрудник",
  demo_manager: "Демо-менеджер",
};

/** Role presets (spec "Caps" table). */
export const ROLE_PRESETS: Record<string, Cap[]> = {
  superadmin: ALL_CAPS,
  manager: ["master_switch", "settings", "manage_users", "audit_log", "alerts", "bot_changes"],
  demo_manager: ["master_switch", "settings", "manage_users", "audit_log", "alerts", "bot_changes"],
  employee: ["master_switch", "bot_changes"],
};

/** AI employees that exist today (id -> label). */
export const AI_EMPLOYEES: Array<{ id: string; name: string }> = [{ id: "vera", name: "Вера" }];

export function normalizeRole(role: string | undefined | null, isAdmin?: boolean): RoleId {
  if (isAdmin || role === "superadmin") return "superadmin";
  if (role === "demo_manager") return "demo_manager";
  if (role === "employee" || role === "client_operator" || role === "tester") return "employee";
  return "manager"; // manager, client_admin, admin, ''
}

/**
 * Fallback for old backends whose /auth/me has no `permissions`: they let client_admin edit
 * instructions and have no /users or /audit-log, so those caps are decided accordingly.
 */
export function legacyCaps(role: RoleId): Cap[] {
  if (role === "superadmin") return ALL_CAPS;
  if (role === "employee") return ["master_switch", "bot_changes"];
  return ["master_switch", "settings", "instructions", "alerts", "bot_changes"];
}

export function deriveCaps(user: User, permissions?: string[]): Set<string> {
  if (Array.isArray(permissions)) return new Set(permissions);
  if (Array.isArray((user as any).permissions)) return new Set((user as any).permissions as string[]);
  return new Set(legacyCaps(normalizeRole(user.role, user.is_admin)));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") || iso.endsWith("Z") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
