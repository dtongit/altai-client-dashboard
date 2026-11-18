"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PartnerMe } from "@/types";
import { rubNumber } from "@/lib/partner-format";

// ---------- partner context (profile loaded once by the portal layout) ----------

interface PartnerCtx {
  me: PartnerMe;
  refresh: () => Promise<void>;
  setMe: (me: PartnerMe) => void;
}
export const PartnerContext = createContext<PartnerCtx | null>(null);
export function usePartner(): PartnerCtx {
  const c = useContext(PartnerContext);
  if (!c) throw new Error("usePartner must be used inside the partner layout");
  return c;
}

// ---------- data loading ----------

export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError((e as { detail?: string })?.detail || "Не удалось загрузить данные. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading, reload };
}

// ---------- building blocks ----------

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-[var(--pp-muted)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--pp-accent)] border-t-transparent" />
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300 flex items-center justify-between gap-3">
      <span>{text}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold">
          Повторить
        </button>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-card)] p-4 sm:p-5 ${className}`}>{children}</section>
  );
}

export function PageTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h1 className="pp-head text-lg sm:text-2xl text-[var(--pp-text)]">{children}</h1>
      {hint && <p className="mt-1 text-xs sm:text-sm text-[var(--pp-muted)]">{hint}</p>}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="pp-head text-[10px] sm:text-[11px] text-[var(--pp-muted)] mb-1">{children}</div>;
}

export function Empty({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--pp-line)] p-6 text-center">
      {title && <div className="pp-head text-sm mb-2">{title}</div>}
      <p className="text-sm text-[var(--pp-muted)] leading-relaxed">{children}</p>
    </div>
  );
}

const CHIP_TONES: Record<string, string> = {
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  info: "bg-[var(--pp-accent-soft)] text-[var(--pp-accent)]",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  mute: "bg-slate-500/15 text-[var(--pp-muted)]",
};
export function Chip({ tone = "mute", children }: { tone?: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${CHIP_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function clientStatusTone(status: string): keyof typeof CHIP_TONES {
  if (status === "paying") return "good";
  if (status === "launch_paid" || status === "demo") return "info";
  if (status === "paused") return "warn";
  return "mute";
}

// ---------- money ----------

/** Counting-up number (0.8 s, ease-out) of kopecks shown as «1 000 000 ₽». Respects reduced motion. */
export function CountUp({ kop, className = "", duration = 800 }: { kop: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(kop);
  const fromRef = useRef(0);
  const firstRef = useRef(true);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = firstRef.current ? 0 : fromRef.current;
    firstRef.current = false;
    if (reduce || from === kop) {
      setShown(kop);
      fromRef.current = kop;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (kop - from) * eased;
      fromRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kop, duration]);
  return (
    <span className={`pp-num ${className}`}>
      {rubNumber(shown)}
      {" ₽"}
    </span>
  );
}

/** Money the partner receives: green. */
export function Money({ kop, className = "" }: { kop: number; className?: string }) {
  return (
    <span className={`pp-num text-[var(--pp-money)] ${className}`}>
      {rubNumber(kop)}
      {" ₽"}
    </span>
  );
}

export const inputCls = "w-full px-3 py-2.5 text-base";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--pp-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--pp-line)] px-4 py-2.5 text-sm font-semibold text-[var(--pp-text)] hover:bg-[var(--pp-accent-soft)] disabled:opacity-50 transition";
