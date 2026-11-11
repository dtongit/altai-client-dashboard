"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { AuditLogEntry, Cap, TeamMember, TeamUser } from "@/types";
import {
  AI_EMPLOYEES,
  ALL_CAPS,
  CAP_LABELS,
  formatDateTime,
} from "@/lib/permissions";
import {
  Check,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const AUDIT_PAGE = 20;

const AUDIT_ACTIONS: Array<[string, string]> = [
  ["user.created", "Создан аккаунт"],
  ["user.added_to_tenant", "Добавлен в компанию"],
  ["user.removed_from_tenant", "Убран из компании"],
  ["user.access_changed", "Изменён доступ к ИИ-сотрудникам"],
  ["user.permissions_changed", "Изменены права"],
  ["user.deactivated", "Пользователь отключён"],
  ["user.activated", "Пользователь включён"],
  ["user.password_reset", "Сброшен пароль"],
  ["vera.paused", "Вера остановлена"],
  ["vera.resumed", "Вера запущена"],
  ["chat.paused", "Чат на паузе"],
  ["chat.resumed", "Чат возобновлён"],
  ["chat.reset", "Чат сброшен"],
  ["chat.message_sent", "Сообщение оператора"],
  ["telegram.linked", "Telegram привязан"],
  ["telegram.unlinked", "Telegram отвязан"],
  ["kb.change_applied", "Правка базы знаний"],
  ["prompt.change_applied", "Правка промпта"],
  ["skill.change_applied", "Правка навыка"],
];
const ACTION_LABELS = Object.fromEntries(AUDIT_ACTIONS);

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60";

function tgInfo(u: TeamUser) {
  const t = u.telegram;
  if (!t) return null;
  const username = t.username ?? t.telegram_username ?? null;
  return {
    name: t.display_name || (username ? `@${username}` : "Telegram"),
    bot: t.bot_username || null,
  };
}

interface FormState {
  id: string | null;
  username: string;
  email: string;
  password: string;
  caps: Cap[];
  allEmployees: boolean;
  employeeIds: string[];
}

export default function TeamPage() {
  const { user: me, role: myRole, can, hasEmployee, tenant } = useAuth();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const isSuper = myRole === "superadmin";

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [legacy, setLegacy] = useState<TeamMember[]>([]);

  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditAction, setAuditAction] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const canAudit = can("audit_log");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
      if (res.bot_username) setBotUsername(res.bot_username);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Не удалось загрузить команду");
    } finally {
      setLoading(false);
    }
    // Legacy Telegram members (read-only list, needs cap `settings`); unlinked rows can be removed.
    try {
      const res = await api.getTeamMembers();
      setLegacy((res.members || []).filter((m) => !m.user_id));
      if (res.bot_username) setBotUsername(res.bot_username);
    } catch {
      setLegacy([]);
    }
  }, []);

  const loadAudit = useCallback(
    async (offset: number, action: string) => {
      if (!canAudit) return;
      setAuditLoading(true);
      try {
        const res = await api.getAuditLog({ limit: AUDIT_PAGE, offset, action: action || undefined });
        const rows = res.entries || res.items || [];
        setAudit(rows);
        setAuditHasMore(res.total != null ? offset + rows.length < res.total : rows.length === AUDIT_PAGE);
      } catch (e: any) {
        showToast(e?.message || "Не удалось загрузить журнал", "error");
      } finally {
        setAuditLoading(false);
      }
    },
    [canAudit, showToast]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers, tenant?.id]);

  useEffect(() => {
    void loadAudit(auditOffset, auditAction);
  }, [loadAudit, auditOffset, auditAction, tenant?.id]);

  const openCreate = () => {
    setFormError(null);
    setForm({
      id: null,
      username: "",
      email: "",
      password: "",
      caps: ["master_switch", "bot_changes"],
      allEmployees: true,
      employeeIds: [],
    });
  };

  const openEdit = (u: TeamUser) => {
    setFormError(null);
    const ids = u.membership?.employee_ids;
    setForm({
      id: u.id,
      username: u.username,
      email: u.email || "",
      password: "",
      caps: [...(u.membership?.permissions || [])],
      allEmployees: ids === "*",
      employeeIds: Array.isArray(ids) ? ids : [],
    });
  };

  const editing = useMemo(() => users.find((u) => u.id === form?.id) || null, [users, form?.id]);
  const isSelf = Boolean(editing && me && editing.id === me.id);

  const toggleCap = (cap: Cap) =>
    setForm((f) =>
      f ? { ...f, caps: f.caps.includes(cap) ? f.caps.filter((c) => c !== cap) : [...f.caps, cap] } : f
    );

  const save = async () => {
    if (!form) return;
    setFormError(null);
    if (!form.id && !form.username.trim()) return setFormError("Укажите логин");
    if (form.password && form.password.length < 8) return setFormError("Пароль — не короче 8 символов");
    const employee_ids: "*" | string[] = form.allEmployees ? "*" : form.employeeIds;
    setSaving(true);
    try {
      if (!form.id) {
        const res = await api.createUser({
          username: form.username.trim(),
          email: form.email.trim() || undefined,
          password: form.password || undefined,
          permissions: form.caps,
          employee_ids,
        });
        showToast(res.existing_account ? "Пользователь уже существует — добавлен в компанию" : "Пользователь создан", "success");
      } else if (editing && !isSelf) {
        await api.updateUser(form.id, {
          permissions: form.caps,
          employee_ids,
          ...(form.password ? { password: form.password } : {}),
        });
        showToast("Изменения сохранены", "success");
      } else if (form.password) {
        await api.updateUser(form.id, { password: form.password });
        showToast("Пароль обновлён", "success");
      }
      setForm(null);
      await loadUsers();
      if (canAudit) void loadAudit(0, auditAction);
    } catch (e: any) {
      // Includes the API's 403 text (only an administrator resets another account's password).
      setFormError(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (u: TeamUser, next: boolean) => {
    if (!next) {
      const ok = await confirm({
        title: "Отключить пользователя?",
        text: `Отключить «${u.username}» в этой компании? Доступ к кабинету и боту пропадёт, аккаунт останется.`,
        confirmLabel: "Отключить",
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(u.id);
    try {
      await api.updateUser(u.id, { is_active: next });
      await loadUsers();
      if (canAudit) void loadAudit(0, auditAction);
    } catch (e: any) {
      showToast(e?.message || "Не удалось изменить статус", "error");
    } finally {
      setBusyId(null);
    }
  };

  const removeFromCompany = async (u: TeamUser) => {
    const ok = await confirm({
      title: "Убрать из компании?",
      text: `Убрать «${u.username}» из компании? Аккаунт сохранится, но доступ к этой компании пропадёт.`,
      confirmLabel: "Убрать",
      danger: true,
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await api.removeUser(u.id);
      showToast("Пользователь убран из компании", "success");
      if (form?.id === u.id) setForm(null);
      await loadUsers();
      if (canAudit) void loadAudit(0, auditAction);
    } catch (e: any) {
      showToast(e?.message || "Не удалось убрать из компании", "error");
    } finally {
      setBusyId(null);
    }
  };

  const copyInvite = async (u: TeamUser) => {
    setBusyId(u.id);
    try {
      const res = await api.createUserTelegramInvite(u.id);
      try {
        await navigator.clipboard.writeText(res.invite_url);
        setCopiedId(u.id);
        setTimeout(() => setCopiedId((c) => (c === u.id ? null : c)), 2500);
        showToast(`Ссылка скопирована${res.bot_username ? ` (бот @${res.bot_username})` : ""}. Действует 24 часа, привязывает Telegram к этому пользователю.`, "success");
      } catch {
        window.prompt("Скопируйте ссылку для Telegram", res.invite_url);
      }
    } catch (e: any) {
      showToast(e?.message || "Не удалось создать ссылку", "error");
    } finally {
      setBusyId(null);
    }
  };

  const removeLegacy = async (m: TeamMember) => {
    const ok = await confirm({
      title: "Удалить из команды бота?",
      text: `Удалить «${m.display_name}» из команды бота?`,
      confirmLabel: "Удалить",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTeamMember(m.id);
      await loadUsers();
    } catch (e: any) {
      showToast(e?.message || "Ошибка удаления", "error");
    }
  };

  const employeeCell = (u: TeamUser) => {
    const ids = u.membership?.employee_ids;
    if (ids === "*") return "Все";
    const names = (ids || []).map((id) => AI_EMPLOYEES.find((e) => e.id === id)?.name || id);
    return names.length ? names.join(", ") : "Нет доступа";
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Команда и доступы
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Кто работает с компанией «{tenant?.business_name}» в кабинете и в Telegram-боте
              {botUsername && (
                <>
                  {" "}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    @{botUsername}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить пользователя</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          {error}
        </div>
      )}

      {/* Users table (desktop) & cards (mobile) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span>Люди компании ({users.length})</span>
          <button onClick={() => void loadUsers()} className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Обновить</span>
          </button>
        </div>

        {/* Mobile cards (< md) */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {users.map((u) => {
            const tg = tgInfo(u);
            const active = u.membership?.is_active !== false && u.is_active;
            const caps = u.membership?.permissions || [];
            const menuItems: MenuItem[] = [
              {
                label: copiedId === u.id ? "Скопировано!" : "Ссылка для Telegram",
                icon: copiedId === u.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />,
                onClick: () => copyInvite(u),
                hidden: !active,
              },
              {
                label: "Изменить",
                icon: <Pencil className="h-4 w-4" />,
                onClick: () => openEdit(u),
              },
              ...(u.id !== me?.id
                ? [
                    {
                      label: active ? "Отключить" : "Включить",
                      onClick: () => setActive(u, !u.is_active),
                      danger: active,
                    },
                    {
                      label: "Убрать из компании",
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => removeFromCompany(u),
                      danger: true,
                    },
                  ]
                : []),
            ];

            return (
              <div key={u.id} className={`p-4 space-y-3 ${active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {u.username}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                          active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {active ? "Активен" : "Отключён"}
                      </span>
                    </div>
                    {u.email && !u.email.endsWith("@users.altai.local") && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {u.email}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center">
                    <Menu items={menuItems} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">Telegram:</span>
                  {tg ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
                      {tg.name} {tg.bot && <span className="text-zinc-400">(@{tg.bot})</span>}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">Не привязан</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">ИИ-сотрудники:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                    {employeeCell(u)}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Права ({caps.length})
                  </div>
                  {caps.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {caps.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                        >
                          {CAP_LABELS[c]?.title || c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400 italic">Нет прав</span>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && users.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              В компании пока никого нет
            </div>
          )}
        </div>

        {/* Desktop table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-2 font-semibold">Имя</th>
                <th className="px-3 py-2 font-semibold">ИИ-сотрудники</th>
                <th className="px-3 py-2 font-semibold">Права</th>
                <th className="px-3 py-2 font-semibold">Telegram</th>
                <th className="px-3 py-2 font-semibold">Статус</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const tg = tgInfo(u);
                const active = u.membership?.is_active !== false && u.is_active;
                const nCaps = u.membership?.permissions?.length || 0;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 ${active ? "" : "opacity-60"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-white">{u.username}</div>
                      {u.email && !u.email.endsWith("@users.altai.local") && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{u.email}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{employeeCell(u)}</td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">
                      <span title={(u.membership?.permissions || []).map((c) => CAP_LABELS[c]?.title || c).join(", ")}>
                        {nCaps > 0 ? `${nCaps} из ${ALL_CAPS.length}` : "Нет прав"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {tg ? (
                        <div>
                          <span className="text-emerald-700 dark:text-emerald-400">{tg.name}</span>
                          {tg.bot && <div className="text-[11px] text-zinc-500 dark:text-zinc-400">@{tg.bot}</div>}
                        </div>
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-400">Не привязан</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {active ? "Активен" : "Отключён"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => copyInvite(u)}
                          disabled={busyId === u.id || !active}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 disabled:opacity-50"
                          title="Одноразовая ссылка: человек откроет её в Telegram и привяжется к этому пользователю"
                        >
                          {copiedId === u.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedId === u.id ? "Скопировано" : "Ссылка для Telegram"}</span>
                        </button>
                        {true && (
                          <>
                            <button
                              onClick={() => openEdit(u)}
                              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              Изменить
                            </button>
                            {u.id !== me?.id && (
                              <button
                                onClick={() => setActive(u, !u.is_active)}
                                disabled={busyId === u.id}
                                className={`px-2 py-1 rounded-lg text-[11px] font-medium ${
                                  active
                                    ? "text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400"
                                    : "text-amber-700 dark:text-amber-400 font-semibold"
                                }`}
                              >
                                {active ? "Отключить" : "Включить"}
                              </button>
                            )}
                            {u.id !== me?.id && (
                              <button
                                onClick={() => removeFromCompany(u)}
                                disabled={busyId === u.id}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                Убрать из компании
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    В компании пока никого нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legacy unlinked Telegram members */}
      {legacy.length > 0 && (
        <div className="rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Telegram без аккаунта кабинета ({legacy.length})
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              Эти участники подключены к боту по старой схеме и не привязаны к пользователю. Бот им не отвечает. Удалите
              запись и пригласите человека заново через «Ссылку для Telegram».
            </p>
          </div>
          <div className="space-y-2">
            {legacy.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{m.display_name}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {m.telegram_username ? `@${m.telegram_username}` : `ID: ${m.telegram_user_id}`}
                  </div>
                </div>
                <button
                  onClick={() => removeLegacy(m)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex-shrink-0"
                  title="Удалить из команды бота"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit log */}
      {canAudit && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Журнал действий</h3>
            <div className="flex items-center gap-2">
              <select
                value={auditAction}
                onChange={(e) => {
                  setAuditOffset(0);
                  setAuditAction(e.target.value);
                }}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-0 flex-1 sm:flex-none"
              >
                <option value="">Все действия</option>
                {AUDIT_ACTIONS.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void loadAudit(auditOffset, auditAction)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                title="Обновить"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {audit.map((e) => (
              <li key={e.id} className="px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-start sm:gap-4">
                <span className="text-zinc-500 dark:text-zinc-400 sm:w-32 flex-shrink-0">{formatDateTime(e.created_at)}</span>
                <span className="font-medium text-zinc-900 dark:text-white sm:w-56 flex-shrink-0">
                  {ACTION_LABELS[e.action] || e.action}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400 min-w-0 break-words">
                  {e.actor_name || (e.actor_type === "system" ? "Система" : "—")}
                  {e.target ? ` · ${e.target}` : ""}
                </span>
              </li>
            ))}
            {audit.length === 0 && !auditLoading && (
              <li className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Записей пока нет</li>
            )}
          </ul>
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              disabled={auditOffset === 0 || auditLoading}
              onClick={() => setAuditOffset(Math.max(0, auditOffset - AUDIT_PAGE))}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"
            >
              Новее
            </button>
            <span className="text-zinc-500 dark:text-zinc-400">
              {audit.length ? `${auditOffset + 1}–${auditOffset + audit.length}` : ""}
            </span>
            <button
              disabled={!auditHasMore || auditLoading}
              onClick={() => setAuditOffset(auditOffset + AUDIT_PAGE)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"
            >
              Старее
            </button>
          </div>
        </div>
      )}

      {/* Create / edit sheet */}
      <Sheet
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? `Доступ: «${form.username}»` : "Добавить в компанию"}
        className="md:!w-[520px]"
      >
        {form && (
          <div className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-xl text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {formError}
              </div>
            )}

            {isSelf && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Свои права и доступы менять нельзя, только пароль.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Логин
                <input
                  className={inputCls}
                  value={form.username}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Email (необязательно)
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="off"
                />
              </label>
            </div>

            {(!form.id || myRole === "superadmin" || isSelf) && (
              <label className="block space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {form.id ? "Новый пароль (оставьте пустым, чтобы не менять)" : "Пароль (только для нового аккаунта, не короче 8 символов)"}
                <input
                  className={inputCls}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
            )}

            {!form.id && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Если такой логин или email уже есть, человек просто получит доступ к этой компании, пароль не меняется.
              </p>
            )}

            {!isSelf && (
              <>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Доступ к ИИ-сотрудникам</div>
                  <label
                    className={`flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 ${
                      !hasEmployee("*") && !isSuper ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-amber-500"
                      checked={form.allEmployees}
                      disabled={!isSuper && !hasEmployee("*")}
                      onChange={(e) => setForm({ ...form, allEmployees: e.target.checked })}
                    />
                    Все ИИ-сотрудники
                  </label>
                  {!form.allEmployees &&
                    AI_EMPLOYEES.map((emp) => {
                      const lacks = !isSuper && !hasEmployee(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 pl-5 ${lacks ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="accent-amber-500"
                            checked={form.employeeIds.includes(emp.id)}
                            disabled={lacks}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                employeeIds: e.target.checked
                                  ? [...form.employeeIds, emp.id]
                                  : form.employeeIds.filter((x) => x !== emp.id),
                              })
                            }
                          />
                          {emp.name}
                        </label>
                      );
                    })}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Права в этой компании</div>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {ALL_CAPS.map((cap) => {
                      const lacks = !isSuper && !can(cap);
                      return (
                        <label
                          key={cap}
                          className={`flex items-start gap-3 px-3 py-2.5 ${lacks ? "opacity-50" : "cursor-pointer"}`}
                          title={lacks ? "У вас самих нет этого права" : undefined}
                        >
                          <input
                            type="checkbox"
                            className="accent-amber-500 mt-0.5"
                            checked={form.caps.includes(cap)}
                            disabled={lacks}
                            onChange={() => toggleCap(cap)}
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-medium text-zinc-900 dark:text-white">
                              {CAP_LABELS[cap].title}
                            </span>
                            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{CAP_LABELS[cap].hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForm(null)}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Сохранение..." : form.id ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <ConfirmDialog />
    </div>
  );
}
