"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bot } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60";

function ownBotUsername(item: Record<string, any> | undefined): string | null {
  if (!item) return null;
  let creds = item.crm_credentials;
  if (typeof creds === "string") {
    try {
      creds = JSON.parse(creds);
    } catch {
      creds = null;
    }
  }
  const u = creds?.team_bot?.username;
  return typeof u === "string" && u ? u : null;
}

/** Superadmin block: the tenant's own Telegram team bot (spec M8). Default = the shared env bot. */
export default function TeamBotCard({ tenantId }: { tenantId: string }) {
  const [own, setOwn] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listAdminCrud("tenants", { search: tenantId, limit: 20 });
      setOwn(ownBotUsername(res.items.find((t) => t.id === tenantId)));
    } catch {
      setOwn(null);
    } finally {
      setLoaded(true);
    }
  }, [tenantId]);

  useEffect(() => {
    setLoaded(false);
    setMessage(null);
    void load();
  }, [load]);

  const save = async () => {
    const name = username.trim().replace(/^@/, "");
    if (!name || !token.trim()) return setMessage({ type: "error", text: "Укажите имя бота и токен" });
    setBusy(true);
    setMessage(null);
    try {
      await api.setTenantTeamBot(tenantId, { token: token.trim(), username: name });
      setToken("");
      setUsername("");
      setMessage({ type: "ok", text: "Бот подключён, вебхук зарегистрирован" });
      await load();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Не удалось подключить бота" });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm("Вернуть общий бот? Участники собственного бота компании будут отключены.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.clearTenantTeamBot(tenantId);
      setMessage({ type: "ok", text: "Возвращён общий бот" });
      await load();
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Не удалось вернуть общий бот" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Telegram-бот команды</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Через него сотрудники компании общаются с Верой. Только для суперадмина.
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-700 dark:text-zinc-300">
        {!loaded ? (
          "Загрузка..."
        ) : own ? (
          <>
            Свой бот компании:{" "}
            <a
              href={`https://t.me/${own}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              @{own}
            </a>
          </>
        ) : (
          "Используется общий бот Optima."
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Имя бота (без @)
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </label>
        <label className="space-y-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Токен от @BotFather
          <input
            className={inputCls}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>

      {message && (
        <p
          role={message.type === "error" ? "alert" : undefined}
          className={`text-xs ${
            message.type === "error" ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {own && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-60"
          >
            Вернуть общий бот
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 shadow-md shadow-amber-500/20"
        >
          {busy ? "Подождите..." : own ? "Заменить бота" : "Подключить свой бот"}
        </button>
      </div>
    </div>
  );
}
