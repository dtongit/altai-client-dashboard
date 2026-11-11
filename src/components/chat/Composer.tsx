"use client";

import React, { useState } from "react";
import { Send } from "lucide-react";

export function Composer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [operatorInput, setOperatorInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorInput.trim() || sending) return;
    setSending(true);
    try {
      await onSend(operatorInput.trim());
      setOperatorInput("");
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 flex items-center gap-2"
    >
      <input
        type="text"
        value={operatorInput}
        onChange={(e) => setOperatorInput(e.target.value)}
        placeholder="Написать клиенту от имени менеджера (ставит ИИ на паузу)..."
        disabled={disabled || sending}
        className="flex-1 px-3.5 py-2 text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <button
        type="submit"
        disabled={disabled || sending || !operatorInput.trim()}
        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
      >
        <Send className="h-3.5 w-3.5" />
        <span>{sending ? "Отправка..." : "Ответить"}</span>
      </button>
    </form>
  );
}
