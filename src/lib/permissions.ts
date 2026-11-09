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
  master_switch: { title: "Включать и выключать Веру", hint: "Выключатель Веры в шапке и в Telegram-боте" },
  settings: { title: "Настройки каналов", hint: "Режимы каналов, Umnico, подключение Telegram" },
  instructions: { title: "Инструкции для Веры", hint: "База знаний, промпты и навыки" },
  manage_users: { title: "Команда и доступы", hint: "Добавлять людей в компанию и менять их права" },
  audit_log: { title: "Журнал действий", hint: "Просмотр журнала действий" },
  alerts: { title: "Уведомления в Telegram", hint: "Получает эскалации и вопросы Веры в Telegram" },
  bot_changes: { title: "Изменения через Telegram-бот", hint: "Просить Веру изменить базу знаний в Telegram" },
};

/** Only global flags have a label: admin and demo manager. Per-company access is a list of permissions. */
export type RoleId = "superadmin" | "demo_manager";

export const ROLE_LABELS: Record<RoleId, string> = {
  superadmin: "Администратор",
  demo_manager: "Демо-менеджер",
};

/** AI employees that exist today (id -> label). */
export const AI_EMPLOYEES: Array<{ id: string; name: string }> = [{ id: "vera", name: "Вера" }];

/** Global flag of an account (not a per-company role). */
export function globalRole(user: User | null | undefined): RoleId | null {
  if (!user) return null;
  if (user.is_admin || user.role === "superadmin") return "superadmin";
  if (user.is_demo_manager || user.role === "demo_manager") return "demo_manager";
  return null;
}

/**
 * Fallback for old backends whose /auth/me has no `permissions`: they let client_admin edit
 * instructions and have no /users or /audit-log, so those caps are decided accordingly.
 */
export function legacyCaps(user: User): Cap[] {
  const g = globalRole(user);
  if (g === "superadmin") return ALL_CAPS;
  if (user.role === "employee" || user.role === "client_operator" || user.role === "tester") return ["master_switch", "bot_changes"];
  return ["master_switch", "settings", "instructions", "alerts", "bot_changes"];
}

export function deriveCaps(user: User, permissions?: string[]): Set<string> {
  if (Array.isArray(permissions)) return new Set(permissions);
  if (Array.isArray((user as any).permissions)) return new Set((user as any).permissions as string[]);
  return new Set(legacyCaps(user));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") || iso.endsWith("Z") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
