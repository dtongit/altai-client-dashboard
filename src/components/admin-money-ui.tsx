"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const aInput =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 px-3 py-2 text-base text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40";
export const aBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-zinc-950 transition";
export const aBtnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition";
export const aBtnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition";
export const aTh = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500 whitespace-nowrap";
export const aTd = "px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 align-middle";

/** Page frame for the super-admin money screens: guards non-admins, header with a back link and a toast. */
export function AdminFrame({
  title,
  subtitle,
  children,
  toast,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  toast: { type: "success" | "error"; text: string } | null;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user?.is_admin);
  useEffect(() => {
    if (!loading && user && !allowed) router.replace("/");
  }, [loading, user, allowed, router]);
  if (!allowed) return null;
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Консоль
        </Link>
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {children}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 z-[80] max-w-sm rounded-xl px-4 py-3 text-xs font-semibold shadow-xl ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

export function useToastLocal() {
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const show = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast((p) => (p?.text === text ? null : p)), 4500);
  };
  const fail = (e: unknown) => show("error", (e as { detail?: string })?.detail || "Ошибка запроса");
  return { toast, show, fail };
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-zinc-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "mute" | "info"; children: React.ReactNode }) {
  const m = {
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bad: "bg-red-500/15 text-red-700 dark:text-red-300",
    info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    mute: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${m}`}>{children}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<[T, string]>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {tabs.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            value === k
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
      <table className="w-full min-w-max divide-y divide-zinc-200 dark:divide-zinc-800">{children}</table>
    </div>
  );
}

/** Roubles text input <-> kopecks. Keeps its own text so typing "12." works. */
export function RubInput({ kop, onChange, className = aInput }: { kop: number; onChange: (kop: number) => void; className?: string }) {
  const [text, setText] = useState(String(kop / 100));
  useEffect(() => {
    setText((t) => (Math.round(Number(t.replace(",", ".")) * 100) === kop ? t : String(kop / 100)));
  }, [kop]);
  return (
    <input
      inputMode="decimal"
      className={className}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(/\s/g, "").replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100));
      }}
    />
  );
}

/** Basis points shown as percent. */
export function PctInput({ bp, onChange }: { bp: number; onChange: (bp: number) => void }) {
  const [text, setText] = useState(String(bp / 100));
  useEffect(() => {
    setText((t) => (Math.round(Number(t.replace(",", ".")) * 100) === bp ? t : String(bp / 100)));
  }, [bp]);
  return (
    <input
      inputMode="decimal"
      className={`${aInput} w-20 !px-2 !py-1.5 text-right`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(",", "."));
        if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100));
      }}
    />
  );
}
