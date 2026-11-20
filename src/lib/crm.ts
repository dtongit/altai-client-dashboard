"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CrmActivity, CrmDeal, CrmField, CrmMeta, CrmPipeline, CrmStage } from "@/types";

/** `12500` -> `12 500 ₽` (non-breaking spaces, no kopecks). */
export function formatRub(v: number | null | undefined): string {
  if (typeof v !== "number" || !isFinite(v)) return "";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v).replace(/ | /g, " ")} ₽`;
}

/** Server timestamps are UTC, with or without «T»/«Z». */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") || iso.endsWith("Z") ? iso : iso.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d;
}

export function relativeTime(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  if (!d) return "—";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "только что";
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч назад`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function fullDateTime(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  return d ? d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}

export function errText(e: unknown, fallback = "Не удалось выполнить действие"): string {
  const a = e as any;
  return a?.detail || a?.message || fallback;
}

export function findStage(pipelines: CrmPipeline[] | undefined | null, stageId: string): CrmStage | null {
  for (const p of pipelines || []) {
    const s = p.stages.find((x) => x.id === stageId);
    if (s) return s;
  }
  return null;
}

export function stageKindClasses(kind: CrmStage["kind"]): string {
  if (kind === "won") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  if (kind === "lost") return "bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700";
  return "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/25";
}

export function actorLabel(a: Pick<CrmActivity, "actor" | "actor_name">): string {
  if (a.actor === "vera") return "Вера";
  // Boss Vera acts on a team member's request: show who asked.
  if (a.actor === "boss_vera") return a.actor_name ? `Вера по просьбе ${a.actor_name}` : "Вера (руководитель)";
  return a.actor_name || "Сотрудник";
}

export function dealTitle(d: Pick<CrmDeal, "title"> & { contact?: { name: string | null } | null }): string {
  return d.contact?.name || d.title || "Без названия";
}

// ---- per-company meta cache: the sidebar, the board and the pages share one request ----
const metaCache = new Map<string, { value: CrmMeta; at: number }>();
const metaInflight = new Map<string, Promise<CrmMeta>>();
const META_TTL_MS = 60_000;

export function invalidateCrmMeta(tenantId?: string | null) {
  if (tenantId) metaCache.delete(tenantId);
  else metaCache.clear();
}

async function loadMeta(tenantId: string, force: boolean): Promise<CrmMeta> {
  const hit = metaCache.get(tenantId);
  if (!force && hit && Date.now() - hit.at < META_TTL_MS) return hit.value;
  let p = metaInflight.get(tenantId);
  if (!p) {
    p = api
      .getCrmMeta()
      .then((v) => {
        metaCache.set(tenantId, { value: v, at: Date.now() });
        return v;
      })
      .finally(() => metaInflight.delete(tenantId));
    metaInflight.set(tenantId, p);
  }
  return p;
}

/**
 * `GET /crm/meta` of the current company (cached, refetched on a company switch). `load = false` skips the request
 * (the user has no `crm` cap or no access to Vera).
 */
export function useCrmMeta(load = true) {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const [meta, setMeta] = useState<CrmMeta | null>(() => (tenantId ? metaCache.get(tenantId)?.value ?? null : null));
  const [loading, setLoading] = useState(false);

  const reload = useCallback(
    async (force = true) => {
      if (!tenantId) return null;
      const v = await loadMeta(tenantId, force);
      setMeta(v);
      return v;
    },
    [tenantId]
  );

  useEffect(() => {
    let cancelled = false;
    if (!load || !tenantId) {
      setMeta(null);
      return;
    }
    setLoading(true);
    loadMeta(tenantId, false)
      .then((v) => !cancelled && setMeta(v))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load, tenantId]);

  const fields = (meta?.fields || []) as CrmField[];
  return { meta, loading, reload, fields, pipelines: meta?.pipelines || [] };
}
