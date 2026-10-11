"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SystemStatusResponse } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Building2,
  RefreshCw,
  Send,
  Sliders,
  Bell,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const { tenant } = useAuth();
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getSystemStatus();
      setStatusData(res);
    } catch (e) {
      console.error("Failed to load status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const crmType = (statusData?.crm?.type || tenant?.crm_type || "excel").toLowerCase();
  const isCrmConfigured = statusData?.crm?.configured ?? true;

  let crmBadgeText = "CRM не настроена";
  let crmBadgeStyle =
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

  if (isCrmConfigured) {
    if (crmType === "excel") {
      crmBadgeText = "Excel (Яндекс Диск) подключен";
      crmBadgeStyle =
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    } else if (crmType === "amocrm") {
      crmBadgeText = "amoCRM v4 подключена";
      crmBadgeStyle =
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    } else if (crmType === "bitrix24") {
      crmBadgeText = "Битрикс24 подключен";
      crmBadgeStyle =
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    } else if (crmType === "tg_topic") {
      crmBadgeText = "Telegram-топик подключен";
      crmBadgeStyle =
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    } else {
      crmBadgeText = `${crmType.toUpperCase()} подключена`;
      crmBadgeStyle =
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
    }
  }

  const getCrmUrl = () => {
    if (statusData?.crm?.url) return statusData.crm.url;
    if (crmType === "excel") {
      return "https://disk.yandex.ru/client/disk/CRM";
    }
    if (crmType === "amocrm") {
      return "https://www.amocrm.ru";
    }
    if (crmType === "bitrix24") {
      return "https://www.bitrix24.ru";
    }
    return "https://disk.yandex.ru/client/disk";
  };

  const crmUrl = getCrmUrl();

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Sliders className="h-6 w-6 text-amber-500" />
          <span>Каналы и управление системой</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Статусы мессенджеров Веры для приема заявок и параметры синхронизации с CRM
        </p>
      </div>

      {/* Connected Channels Grid */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Подключенные каналы коммуникации
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Статусы каналов связи Веры для приема заявок и консультации клиентов
            </p>
          </div>
          <button
            onClick={loadStatus}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            title="Обновить статусы"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              name: "Telegram",
              type: "telegram",
              configured: statusData?.channels?.find((c) => c.type === "telegram")?.configured ?? true,
              detail: statusData?.channels?.find((c) => c.type === "telegram")?.detail ?? "Бот подключен и принимает входящие сообщения",
            },
            {
              name: "WhatsApp",
              type: "whatsapp",
              configured: statusData?.channels?.find((c) => c.type === "whatsapp")?.configured ?? false,
              detail: statusData?.channels?.find((c) => c.type === "whatsapp")?.detail ?? "Ожидает подключения бизнес-номера",
            },
            {
              name: "MAX",
              type: "max",
              configured: statusData?.channels?.find((c) => c.type === "max")?.configured ?? false,
              detail: statusData?.channels?.find((c) => c.type === "max")?.detail ?? "Корпоративный мессенджер не настроен",
            },
            {
              name: "Instagram",
              type: "instagram",
              configured: statusData?.channels?.find((c) => c.type === "instagram")?.configured ?? false,
              detail: statusData?.channels?.find((c) => c.type === "instagram")?.detail ?? "Direct-сообщения не настроены",
            },
            {
              name: "Ваш сайт",
              type: "web",
              configured: statusData?.channels?.find((c) => c.type === "web")?.configured ?? true,
              detail: statusData?.channels?.find((c) => c.type === "web")?.detail ?? "Интерактивный виджет на сайте активен",
            },
            {
              name: "Email",
              type: "email",
              configured: statusData?.channels?.find((c) => c.type === "email")?.configured ?? false,
              detail: statusData?.channels?.find((c) => c.type === "email")?.detail ?? "Корпоративная почта не настроена",
            },
          ].map((ch) => (
            <div
              key={ch.name}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">{ch.name}</span>
                {ch.configured ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Активен</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Не настроен</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{ch.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CRM Integration Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Синхронизация с CRM</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Автоматическое сохранение заявок и передача BANT-квалификации
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${crmBadgeStyle}`}>
              {crmBadgeText}
            </span>

            {crmUrl && (
              <a
                href={crmUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Открыть CRM в новой вкладке"
              >
                <span>Открыть CRM</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Тип CRM:</span>
            <span className="font-semibold uppercase text-zinc-900 dark:text-white">
              {crmType === "excel" ? "Excel (файл на Яндекс Диске)" : crmType.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Режим создания лида:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {crmType === "excel"
                ? "Автоматическая запись строк в онлайн-таблицу .xlsx"
                : "Complex Lead с передачей контакта и суммы"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Передача истории переписки:</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {crmType === "excel"
                ? "Фиксация колонок: BANT-потребность, телефон, бюджет, резюме диалога"
                : "Автоматически в примечание сделки"}
            </span>
          </div>
          {crmType === "excel" && (
            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <span className="text-zinc-500">Хранилище таблицы:</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Яндекс Диск (папка /CRM/leads.xlsx)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Staff Telegram Alert Setting & Recipients */}
      {statusData?.telegram_bot?.has_subscribers ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm dark:shadow-none transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                Telegram-оповещения настроены ({statusData.telegram_bot.subscribers_count} получатель(ей))
              </h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Сотрудники компании подключены к боту @altai_optima_vera_bot и получают уведомления о горячих лидах
              </p>
            </div>
          </div>

          <a
            href={`https://t.me/altai_optima_vera_bot?start=tenant_${tenant?.id || statusData?.tenant_id || "demo_amo"}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            <Send className="h-3.5 w-3.5 text-sky-500" />
            <span>Подключить еще сотрудника</span>
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/20 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-start sm:items-center gap-3 text-left">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <span className="block text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">
                Напишите Вере в телеграм, чтобы быть с ней на связи
              </span>
              <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                Вы сможете обсуждать с Верой её задачи и статус. А если что-то случится, Вера сразу вам напишет
              </p>
            </div>
          </div>
          <a
            href={`https://t.me/altai_optima_vera_bot?start=tenant_${tenant?.id || statusData?.tenant_id || "demo_amo"}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all flex-shrink-0 self-stretch sm:self-auto justify-center"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Написать</span>
          </a>
        </div>
      )}
    </div>
  );
}
