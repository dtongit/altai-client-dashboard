"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme, Theme } from "@/lib/theme-context";
import { api } from "@/lib/api";
import { SystemStatusResponse } from "@/types";
import {
  Power,
  CheckCircle2,
  XCircle,
  Building2,
  RefreshCw,
  Send,
  Sliders,
  Bell,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const { tenant, toggleActive } = useAuth();
  const { theme, setTheme } = useTheme();
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

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

  const handleMasterToggle = async () => {
    setToggling(true);
    const currentState = statusData?.is_active ?? tenant?.is_active ?? true;
    const ok = await toggleActive(!currentState);
    if (ok) {
      setStatusData((prev) => (prev ? { ...prev, is_active: !currentState } : prev));
    }
    setToggling(false);
  };

  const isActive = statusData?.is_active ?? tenant?.is_active ?? true;

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

  const themeOptions: {
    id: Theme;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "system",
      title: "Системная (по умолчанию)",
      description: "Автоматически повторяет цветовую схему вашей операционной системы",
      icon: <Monitor className="h-5 w-5" />,
    },
    {
      id: "light",
      title: "Светлая тема",
      description: "Контрастный белый фон и мягкие янтарные акценты для дневной работы",
      icon: <Sun className="h-5 w-5" />,
    },
    {
      id: "dark",
      title: "Тёмная тема",
      description: "Глубокая ночная палитра с минимальной нагрузкой на зрение",
      icon: <Moon className="h-5 w-5" />,
    },
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Sliders className="h-6 w-6 text-amber-500" />
          <span>Каналы и управление системой</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Контроль глобальной активности ИИ-продавца, тема интерфейса, статусы мессенджеров и синхронизации с CRM
        </p>
      </div>

      {/* Master Emergency Switch Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all shadow-sm ${
          isActive
            ? "border-emerald-300 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50/70 via-white to-zinc-50 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-950"
            : "border-amber-300 dark:border-amber-500/30 bg-gradient-to-r from-amber-50/70 via-white to-zinc-50 dark:from-amber-950/20 dark:via-zinc-900 dark:to-zinc-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-amber-500 dark:bg-amber-400"
                }`}
              />
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-600 dark:text-zinc-400">
                Главный рубильник ИИ-продавца
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {isActive ? "Вера активна во всех каналах" : "ИИ-продавец поставлен на глобальную паузу"}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
              {isActive
                ? "Автономная система отвечает клиентам 24/7 во всех подключенных мессенджерах. Чтобы временно отключить автоответы на время техработ или инвентаризации, нажмите кнопку справа."
                : "Автоответы заморожены. Все входящие сообщения продолжают фиксироваться в базе и передаваться вашим менеджерам в CRM без ответов от лица ИИ."}
            </p>
          </div>

          <button
            onClick={handleMasterToggle}
            disabled={toggling}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg ${
              isActive
                ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
                : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
            }`}
          >
            <Power className="h-4 w-4" />
            <span>{isActive ? "Поставить всю систему на паузу" : "Включить ИИ во всех каналах"}</span>
          </button>
        </div>
      </div>

      {/* Theme Selection Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Тема оформления кабинета</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Выберите комфортную цветовую схему для работы с дашбордом
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 hover:bg-zinc-100 dark:hover:bg-zinc-900/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {opt.icon}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <Check className="h-3.5 w-3.5" />
                        <span>Выбрано</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">{opt.title}</div>
                  <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected Channels Grid */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Подключенные каналы коммуникации
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Статусы коннекторов мессенджеров для приема заявок
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusData?.channels.map((ch) => (
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

      {/* Staff Telegram Alert Setting */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm flex items-center justify-between gap-4 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
              Мгновенные алерты команде в Telegram
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Оповещения директору и РОПу о горячих лидах, сбоях оплаты или ручном перехвате диалога
            </p>
          </div>
        </div>

        <a
          href="https://t.me/altaioptima"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white text-xs font-medium transition-colors"
        >
          <Send className="h-3.5 w-3.5 text-sky-500" />
          <span>Настроить получателей</span>
        </a>
      </div>
    </div>
  );
}
