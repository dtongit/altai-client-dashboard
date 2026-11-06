"use client";

import React, { useState } from "react";
import { Check, CheckCircle2, KeyRound, Link2, XCircle } from "lucide-react";
import type { UmnicoStatus } from "@/types";
import { api } from "@/lib/api";
import { channelLabel } from "./channel-meta";

interface Props {
  status: UmnicoStatus | null;
  loading: boolean;
  isSuperadmin: boolean;
  onChanged: () => void;
}

function lineTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("instagram")) return "Instagram";
  return channelLabel(t);
}

export default function UmnicoCard({ status, loading, isSuperadmin, onChanged }: Props) {
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const connected = Boolean(status?.connected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.connectUmnico(tokenInput.trim());
      setMessage({ type: "success", text: res.message || "Umnico подключён. Режимы каналов не изменились." });
      setTokenInput("");
      onChanged();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Не удалось подключить Umnico" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Umnico</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Единое окно для Instagram, WhatsApp и других мессенджеров</p>
          </div>
        </div>
        {status && (
          <span
            className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold border ${
              connected
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            }`}
          >
            {connected ? "Подключён" : "Не подключён"}
          </span>
        )}
      </div>

      {!status ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {loading ? "Загрузка..." : "Не удалось получить состояние Umnico"}
        </p>
      ) : status.lines.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Подключённых линий пока нет</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
          {status.lines.map((line, i) => {
            const active = line.status === "active";
            return (
              <li key={`${line.type}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                <span className="font-medium text-zinc-900 dark:text-white">{lineTypeLabel(line.type)}</span>
                {active ? (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Активна</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Требуется повторная авторизация</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isSuperadmin && (
        <div className="space-y-3 pt-1">
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                <span>API-токен Umnico</span>
              </span>
              {status?.masked_token && (
                <span className="text-[11px] font-mono text-zinc-500 break-all">Сохранён: {status.masked_token}</span>
              )}
            </div>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={status?.masked_token ? "Введите новый токен для обновления" : "Вставьте токен из Umnico"}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button
              type="submit"
              disabled={saving || !tokenInput.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? "Проверка токена..." : "Проверить и сохранить токен"}</span>
            </button>
            {message && (
              <p
                role={message.type === "error" ? "alert" : undefined}
                className={`text-[11px] ${
                  message.type === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {message.text}
              </p>
            )}
          </form>

          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-500">Сотрудник Umnico</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium text-right">
                {status?.user_name ? `${status.user_name}${status.user_id != null ? ` (ID: ${status.user_id})` : ""}` : "Не привязан"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-500">Вебхук</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium text-right">
                {status?.webhook_id != null ? `Зарегистрирован (ID: ${status.webhook_id})` : "Не создан"}
              </span>
            </div>
            {status?.webhook_url && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <code className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono truncate">
                  {status.webhook_url}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
