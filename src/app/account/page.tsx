"use client";

import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";

const MIN_PASSWORD = 8;

/** Own account: change the password with the current one. */
export default function AccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;
  const canSave = current.length > 0 && next.length >= MIN_PASSWORD && !saving;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      showToast("Пароль изменён. На других устройствах нужно войти заново.", "success");
    } catch (err: any) {
      setError(err?.detail || err?.message || "Не удалось сменить пароль");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500";

  return (
    <div className="p-4 sm:p-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
          <KeyRound className="h-6 w-6 text-amber-500" />
          Смена пароля
        </h1>
        {user && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Пользователь: {user.username}</p>}
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm"
      >
        <div>
          <label htmlFor="current-password" className="block text-xs font-semibold text-zinc-500 mb-1">
            Текущий пароль
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold text-zinc-500 mb-1">
            Новый пароль
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputCls}
          />
          <p className={`text-xs mt-1 ${tooShort ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"}`}>
            Не короче {MIN_PASSWORD} символов
          </p>
        </div>

        {error && <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>}

        <button
          type="submit"
          disabled={!canSave}
          className="w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сменить пароль
        </button>
      </form>
    </div>
  );
}
