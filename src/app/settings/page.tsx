"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SystemStatusResponse, InstagramStatus } from "@/types";
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
  Copy,
  Check,
  ShieldCheck,
  Power,
  KeyRound,
} from "lucide-react";

export default function SettingsPage() {
  const { tenant } = useAuth();
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [togglingIg, setTogglingIg] = useState(false);
  const [igMessage, setIgMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [replyToComments, setReplyToComments] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [res, igRes] = await Promise.all([
        api.getSystemStatus(),
        api.getInstagramStatus().catch(() => null),
      ]);
      setStatusData(res);
      if (igRes) {
        setInstagramStatus(igRes);
        setReplyToComments(Boolean(igRes.reply_to_comments));
      }
    } catch (e) {
      console.error("Failed to load status:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setSavingToken(true);
    setIgMessage(null);
    try {
      const res = await api.connectInstagramUmnico(tokenInput.trim(), replyToComments);
      setIgMessage({ type: "success", text: res.message || "Umnico успешно подключен. Автоответы выключены (безопасный режим)." });
      setTokenInput("");
      const updated = await api.getInstagramStatus();
      setInstagramStatus(updated);
    } catch (err: any) {
      setIgMessage({ type: "error", text: err?.detail || err?.message || "Ошибка подключения к Umnico API" });
    } finally {
      setSavingToken(false);
    }
  };

  const handleToggleInstagram = async () => {
    if (!instagramStatus?.has_token) {
      setIgMessage({ type: "error", text: "Сначала укажите и сохраните API-токен Umnico" });
      return;
    }
    setTogglingIg(true);
    setIgMessage(null);
    try {
      const nextState = !instagramStatus.enabled;
      const res = await api.toggleInstagram(nextState);
      setIgMessage({ type: "success", text: res.message });
      const updated = await api.getInstagramStatus();
      setInstagramStatus(updated);
      await loadStatus();
    } catch (err: any) {
      setIgMessage({ type: "error", text: err?.detail || err?.message || "Ошибка изменения статуса канала" });
    } finally {
      setTogglingIg(false);
    }
  };

  const handleCopyWebhook = () => {
    const url = instagramStatus?.webhook_url || `https://api.optima.altaiweb.online/api/v1/webhook/umnico/${tenant?.id || "tallora"}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
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
              name: "Instagram Direct",
              type: "instagram",
              configured: instagramStatus?.configured ?? (statusData?.channels?.find((c) => c.type === "instagram")?.configured ?? false),
              enabled: instagramStatus?.enabled ?? false,
              detail: instagramStatus?.enabled
                ? `В эфире (@${instagramStatus.instagram_login || "tallora.ru"})`
                : (instagramStatus?.configured || instagramStatus?.has_token)
                ? `Безопасный режим: @${instagramStatus.instagram_login || "подключен"} (отправка выключена)`
                : (statusData?.channels?.find((c) => c.type === "instagram")?.detail ?? "Direct-сообщения не настроены"),
            },
            {
              name: "Ваш сайт",
              type: "web",
              configured: statusData?.channels?.find((c) => c.type === "web")?.configured ?? true,
              enabled: true,
              detail: statusData?.channels?.find((c) => c.type === "web")?.detail ?? "Интерактивный виджет на сайте активен",
            },
            {
              name: "Email",
              type: "email",
              configured: statusData?.channels?.find((c) => c.type === "email")?.configured ?? false,
              enabled: false,
              detail: statusData?.channels?.find((c) => c.type === "email")?.detail ?? "Корпоративная почта не настроена",
            },
          ].map((ch) => (
            <div
              key={ch.name}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">{ch.name}</span>
                {ch.type === "instagram" ? (
                  ch.enabled ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>В эфире</span>
                    </span>
                  ) : ch.configured ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Безопасный режим</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Не настроен</span>
                    </span>
                  )
                ) : ch.configured ? (
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

      {/* Instagram Direct (Umnico) Integration Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm shadow-sm dark:shadow-none space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-500/20 via-rose-500/20 to-amber-500/20 text-pink-600 dark:text-pink-400">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Instagram Direct (Umnico)</h3>
                {instagramStatus?.enabled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>В эфире (Live)</span>
                  </span>
                ) : instagramStatus?.has_token ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Безопасный режим (Выкл)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Ожидает токен
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Автономные консультации, подбор обуви и сбор заявок в Instagram Direct
              </p>
            </div>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleInstagram}
              disabled={togglingIg || !instagramStatus?.has_token}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                instagramStatus?.enabled
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  : instagramStatus?.has_token
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
              }`}
              title={
                !instagramStatus?.has_token
                  ? "Сначала укажите и сохраните токен Umnico"
                  : instagramStatus?.enabled
                  ? "Нажмите, чтобы временно отключить автоответы Веры"
                  : "Нажмите, чтобы включить автоответы Веры в Direct"
              }
            >
              <Power className={`h-3.5 w-3.5 ${togglingIg ? "animate-spin" : ""}`} />
              <span>
                {togglingIg
                  ? "Переключение..."
                  : instagramStatus?.enabled
                  ? "Отключить автоответы"
                  : "Включить автоответы Веры"}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {igMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              igMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30"
            }`}
          >
            {igMessage.text}
          </div>
        )}

        {/* Settings Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form onSubmit={handleSaveToken} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                <span>API-токен Umnico</span>
              </span>
              {instagramStatus?.masked_token && (
                <span className="text-[11px] font-mono text-zinc-500">
                  Сохранен: {instagramStatus.masked_token}
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Скопируйте постоянный API-токен в личном кабинете Umnico: <strong>Настройки → API</strong>
            </p>

            <div className="space-y-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={instagramStatus?.has_token ? "Введите новый токен для обновления..." : "Вставьте JWT-токен из Umnico..."}
                className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
              />

              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                <input
                  type="checkbox"
                  checked={replyToComments}
                  onChange={(e) => setReplyToComments(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-pink-600 focus:ring-pink-500"
                />
                <span>Отвечать только в Direct (комментарии к постам не обрабатывать)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={savingToken || !tokenInput.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className={`h-3.5 w-3.5 ${savingToken ? "animate-spin" : ""}`} />
              <span>{savingToken ? "Проверка в api.umnico.com..." : "Проверить и сохранить токен"}</span>
            </button>
          </form>

          {/* Integration Status & Webhook Info */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Instagram-аккаунт:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {instagramStatus?.instagram_login ? `@${instagramStatus.instagram_login}` : "Определяется автоматически"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Сотрудник Umnico:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {instagramStatus?.user_name ? `${instagramStatus.user_name} (ID: ${instagramStatus.user_id})` : "Не привязан"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Статус вебхука Umnico:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {instagramStatus?.webhook_id ? `Зарегистрирован (ID: ${instagramStatus.webhook_id})` : "Будет создан при сохранении токена"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-500">URL входящего вебхука:</span>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono truncate">
                  {instagramStatus?.webhook_url || `https://api.optima.altaiweb.online/api/v1/webhook/umnico/${tenant?.id || "tallora"}`}
                </code>
                <button
                  onClick={handleCopyWebhook}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                  title="Скопировать URL вебхука"
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              Гарантия безопасности Ritz-Carlton & Operator Takeover
            </p>
            <p>
              Пока тумблер выключен, сообщения в боевой Instagram ни при каких обстоятельствах не отправляются. 
              Когда автоответы включены, любое ручное сообщение оператора из amoCRM или Instagram мгновенно ставит ИИ на паузу в этом диалоге.
            </p>
          </div>
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
