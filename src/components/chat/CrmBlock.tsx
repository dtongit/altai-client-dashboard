"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ChatCrm, ChatCrmDeal, ChatCrmVera, CrmDeal } from "@/types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { errText, formatRub as formatCrmRub } from "@/lib/crm";
import { Button } from "@/components/ui/Button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { safeHttpUrl } from "@/lib/safe-url";

export interface CrmBlockProps {
  crm: ChatCrm | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

function formatPrice(rub?: number | null): string {
  if (typeof rub !== "number") return "";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(rub);
}

function formatRefreshedTime(iso?: string | null): string {
  if (!iso) return "только что";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.floor(diffMs / 60000));
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  if (min < 1440) return `${Math.floor(min / 60)} ч назад`;
  return `${Math.floor(min / 1440)} дн назад`;
}

// "#abc" -> "#aabbcc"; anything that is not a 3/6-digit hex is rejected (neutral pill)
function normalizeHex(color?: string | null): string | null {
  if (!color) return null;
  let c = color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    c = `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : null;
}

function AmoCrmBlock({ crm, loading, onRefresh }: CrmBlockProps) {
  const [refreshing, setRefreshing] = useState(false);

  if (loading) {
    // Tenants without amoCRM never see a skeleton: only show it when a previous answer had a contact
    if (!(crm && crm.crm_type === "amocrm" && crm.contact)) return null;
    return (
      <div className="space-y-2 py-2 animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/3" />
        <div className="h-10 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl w-full" />
        <div className="h-10 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl w-full" />
      </div>
    );
  }

  // Only render when crm is available, crm_type is amocrm, and contact is present
  if (!crm || crm.crm_type !== "amocrm" || !crm.contact) {
    return null;
  }

  const contact = crm.contact;
  const safeContactUrl = safeHttpUrl(contact.url);

  // Deals: active first, closed deals last
  const sortedDeals = [...(crm.deals || [])].sort((a, b) => {
    if (a.closed === b.closed) return 0;
    return a.closed ? 1 : -1;
  });

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        amoCRM
      </div>

      {/* Contact Card */}
      <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
            {contact.name || "Контакт amoCRM"}
          </div>
          {contact.phone && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {contact.phone}
            </div>
          )}
        </div>

        {safeContactUrl && (
          <a
            href={safeContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <span>Открыть</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Deals Section */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Сделки
        </div>

        {sortedDeals.length === 0 ? (
          <div className="text-xs text-zinc-400 dark:text-zinc-500 italic p-2">
            Сделок нет
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedDeals.map((deal) => {
              const safeDealUrl = safeHttpUrl(deal.url);
              const priceFormatted = formatPrice(deal.price);

              const content = (
                <div
                  className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                    deal.closed
                      ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800"
                      : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {deal.name || "Сделка"}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {/* Colored Status Stage Pill */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold truncate max-w-[140px] text-zinc-900 dark:text-zinc-100 ${
                          normalizeHex(deal.status_color) ? "" : "bg-zinc-200 dark:bg-zinc-800"
                        }`}
                        style={
                          normalizeHex(deal.status_color)
                            ? { backgroundColor: `${normalizeHex(deal.status_color)}40` } // 25% alpha
                            : undefined
                        }
                      >
                        {deal.status}
                      </span>

                      {deal.pipeline && (
                        <span className="text-[10px] text-zinc-400 truncate">
                          {deal.pipeline}
                        </span>
                      )}
                    </div>
                  </div>

                  {priceFormatted && (
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                      {priceFormatted}
                    </span>
                  )}
                </div>
              );

              if (safeDealUrl) {
                return (
                  <a
                    key={deal.id}
                    href={safeDealUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {content}
                  </a>
                );
              }
              return <div key={deal.id}>{content}</div>;
            })}
          </div>
        )}
      </div>

      {/* Footer: updated time and refresh */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
        <span>Обновлено {formatRefreshedTime(crm.refreshed_at)}</span>
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          <span>Обновить</span>
        </button>
      </div>
    </div>
  );
}

/** CRM Веры (`crm_type = "vera"`): the contact, the current deal and a stage select that moves it. */
function VeraCrmBlock({ crm }: { crm: ChatCrmVera }) {
  const { user, can } = useAuth();
  // The public chat link page (/c) has no signed-in user: show the data, no actions.
  const canAct = Boolean(user) && can("crm");
  const [deal, setDeal] = useState<CrmDeal | null>(crm.deal);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stages = crm.pipeline?.stages || [];

  // A fresh answer (another chat, refresh) replaces the local copy.
  React.useEffect(() => {
    setDeal(crm.deal);
  }, [crm.deal]);

  const move = async (stageId: string) => {
    if (!deal || stageId === deal.stage_id) return;
    const prev = deal;
    setDeal({ ...deal, stage_id: stageId });
    setBusy(true);
    setError(null);
    try {
      const res = await api.moveCrmDeal(deal.id, stageId);
      setDeal(res.deal || { ...deal, stage_id: stageId });
    } catch (e) {
      setDeal(prev);
      setError(errText(e, "Не удалось переместить сделку"));
    } finally {
      setBusy(false);
    }
  };

  const contact = crm.contact;
  const amount = deal ? formatCrmRub(deal.amount_rub) : "";
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">CRM</div>

      {contact && (
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
          <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">{contact.name || "Контакт"}</div>
          {contact.phone && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{contact.phone}</div>}
          {contact.email && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{contact.email}</div>}
        </div>
      )}

      {deal ? (
        <div className="p-3 rounded-xl border bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-900 dark:text-white">{deal.title || "Сделка"}</div>
            {amount && <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{amount}</span>}
          </div>
          {canAct ? (
            <select
              aria-label="Этап сделки"
              value={deal.stage_id}
              disabled={busy}
              onChange={(e) => move(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              {stages.find((st) => st.id === deal.stage_id)?.name || ""}
            </span>
          )}
          {error && <div className="text-[11px] text-rose-600 dark:text-rose-400">{error}</div>}
          {canAct && (
            <Link href={`/crm/deals/?id=${encodeURIComponent(deal.id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
              Открыть сделку
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 italic p-2">Сделки пока нет — Вера создаст её, когда клиент будет квалифицирован</div>
      )}
    </div>
  );
}

export function CrmBlock(props: CrmBlockProps) {
  if ((props.crm as { crm_type?: string } | null)?.crm_type === "vera") {
    return <VeraCrmBlock crm={props.crm as unknown as ChatCrmVera} />;
  }
  return <AmoCrmBlock {...props} />;
}
