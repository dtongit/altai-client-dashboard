import React from "react";
import {
  User,
  Phone,
  FileText,
  BadgePercent,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BANTData {
  client_name?: string | null;
  client_phone?: string | null;
  need_description?: string | null;
  budget_rub?: number | null;
  is_qualified?: boolean;
  urgency?: string | null;
}

interface CRMResult {
  crm_type?: string;
  success?: boolean;
  lead_id?: string | number | null;
}

interface BANTCardProps {
  qualification?: BANTData | null;
  crmResult?: CRMResult | null;
  crmInfo?: string | null;
}

export function BANTCard({ qualification, crmResult, crmInfo }: BANTCardProps) {
  const isQual = qualification?.is_qualified ?? false;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 backdrop-blur-md shadow-sm dark:shadow-none transition-colors">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl ${
              isQual
                ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
            }`}
          >
            {isQual ? <Flame className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">BANT-квалификация</h4>
            <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Профиль выявленного лида</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isQual
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
              : "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
          }`}
        >
          {isQual ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <span>Лид квалифицирован</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>В процессе диалога</span>
            </>
          )}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Name */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-400">Имя клиента</span>
            <div className="text-xs font-medium text-zinc-900 dark:text-white">
              {qualification?.client_name || "Не указано (уточняется)"}
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3">
          <Phone className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-400">Номер телефона</span>
            <div>
              {qualification?.client_phone ? (
                <a
                  href={`tel:${qualification.client_phone}`}
                  className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                >
                  {qualification.client_phone}
                </a>
              ) : (
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Не предоставлен</span>
              )}
            </div>
          </div>
        </div>

        {/* Need */}
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-400">Потребность</span>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {qualification?.need_description || "Формируется в диалоге..."}
            </p>
          </div>
        </div>

        {/* Budget */}
        {qualification?.budget_rub ? (
          <div className="flex items-start gap-3">
            <BadgePercent className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-400">Зафиксированный бюджет</span>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(qualification.budget_rub)}
              </div>
            </div>
          </div>
        ) : null}

        {/* CRM sync result */}
        {(crmResult?.lead_id || crmInfo) && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">Сделка в CRM:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              <ExternalLink className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
              {crmInfo || `${crmResult?.crm_type?.toUpperCase()} #${crmResult?.lead_id}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
