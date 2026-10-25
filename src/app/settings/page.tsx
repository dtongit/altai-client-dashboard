"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SystemStatusResponse, InstagramStatus, ChannelWorkMode, TeamMember } from "@/types";
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
  Users,
  Crown,
  Shield,
  Trash2,
  Plus,
  Sparkles,
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
  const [showAutoConfirmModal, setShowAutoConfirmModal] = useState(false);

  // Colleague Team Bot State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamBotUsername, setTeamBotUsername] = useState("altai_optima_vera_bot");
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"manager" | "senior">("manager");
  const [generatedInvite, setGeneratedInvite] = useState<{ url: string; token: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [teamActionMsg, setTeamActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await api.getTeamMembers();
      setTeamMembers(res.members || []);
      if (res.bot_username) setTeamBotUsername(res.bot_username);
    } catch (e) {
      console.error("Failed to load team members:", e);
    } finally {
      setLoadingTeam(false);
    }
  };

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
      await loadTeam();
    } catch (e) {
      console.error("Failed to load status:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (role: "manager" | "senior" = inviteRole) => {
    setGeneratingInvite(true);
    setTeamActionMsg(null);
    try {
      const res = await api.createTeamInvite(role);
      setGeneratedInvite({ url: res.invite_url, token: res.token });
    } catch (err: any) {
      setTeamActionMsg({ type: "error", text: err?.detail || err?.message || "Ошибка генерации ссылки" });
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleToggleInstructions = async (m: TeamMember) => {
    try {
      const next = !m.can_modify_instructions;
      await api.updateTeamMember(m.id, { can_modify_instructions: next });
      await loadTeam();
    } catch (err: any) {
      setTeamActionMsg({ type: "error", text: err?.detail || err?.message || "Ошибка обновления прав" });
    }
  };

  const handleToggleActive = async (m: TeamMember) => {
    try {
      const next = !m.is_active;
      await api.updateTeamMember(m.id, { is_active: next });
      await loadTeam();
    } catch (err: any) {
      setTeamActionMsg({ type: "error", text: err?.detail || err?.message || "Ошибка обновления статуса" });
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить сотрудника «${name}» из команды бота?`)) return;
    try {
      await api.deleteTeamMember(id);
      await loadTeam();
    } catch (err: any) {
      setTeamActionMsg({ type: "error", text: err?.detail || err?.message || "Ошибка удаления" });
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

  const currentMode: ChannelWorkMode = !instagramStatus?.enabled
    ? "stop"
    : instagramStatus?.require_approval
    ? "hitl"
    : "auto";

  const handleSelectMode = async (mode: ChannelWorkMode) => {
    if (!instagramStatus?.has_token) {
      setIgMessage({ type: "error", text: "Сначала укажите и сохраните API-токен Umnico" });
      return;
    }
    if (mode === "auto") {
      setShowAutoConfirmModal(true);
      return;
    }
    await applyMode(mode);
  };

  const applyMode = async (mode: ChannelWorkMode) => {
    setTogglingIg(true);
    setIgMessage(null);
    try {
      const enabled = mode !== "stop";
      const res = await api.toggleInstagram(enabled, mode);
      setIgMessage({ type: "success", text: res.message });
      const updated = await api.getInstagramStatus();
      setInstagramStatus(updated);
      await loadStatus();
    } catch (err: any) {
      setIgMessage({ type: "error", text: err?.detail || err?.message || "Ошибка изменения режима канала" });
    } finally {
      setTogglingIg(false);
      setShowAutoConfirmModal(false);
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
                {currentMode === "auto" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>⚡ Автопилот (Live)</span>
                  </span>
                ) : currentMode === "hitl" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>🛡️ Пре-модерация (HITL)</span>
                  </span>
                ) : instagramStatus?.has_token ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <span>🔴 Отключен</span>
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

          {/* 3-Way Mode Segmented Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectMode("stop")}
                disabled={togglingIg || !instagramStatus?.has_token}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                  currentMode === "stop"
                    ? "bg-rose-600 text-white shadow-sm font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
                }`}
                title="Отключить автоответы Веры. Диалоги ведет только оператор."
              >
                <span>🔴 Отключен</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode("hitl")}
                disabled={togglingIg || !instagramStatus?.has_token}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                  currentMode === "hitl"
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
                }`}
                title="Вера генерирует проект ответа и направляет супервизору в Telegram-бот перед отправкой."
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>🛡️ Пре-модерация</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode("auto")}
                disabled={togglingIg || !instagramStatus?.has_token}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                  currentMode === "auto"
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
                }`}
                title="Полный автопилот: Вера отвечает клиентам напрямую без подтверждения."
              >
                <span>⚡ Автопилот</span>
              </button>
            </div>
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

      {/* Colleague Vera Internal Team Bot Section */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  Служебный Telegram-бот «Вера-Коллега»
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  @{teamBotUsername}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Закрытый служебный контур: общение Веры с РОПом и менеджерами, аналитические сводки, двухэтапные правки правил и экстренная эскалация
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setInviteModalOpen(!inviteModalOpen);
              if (!generatedInvite) handleGenerateInvite(inviteRole);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Подключить Telegram / Пригласить</span>
          </button>
        </div>

        {teamActionMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
              teamActionMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            <span>{teamActionMsg.text}</span>
            <button onClick={() => setTeamActionMsg(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Modal / Generator Card */}
        {inviteModalOpen && (
          <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Генератор персональной ссылки-приглашения</span>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Закрыть
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Роль в боте:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => {
                    const r = e.target.value as "manager" | "senior";
                    setInviteRole(r);
                    handleGenerateInvite(r);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="manager">Менеджер (сводка, поиск клиентов, прием эскалаций)</option>
                  <option value="senior">Старший сотрудник / РОП (полные права + изменение правил)</option>
                </select>
              </div>

              <button
                disabled={generatingInvite}
                onClick={() => handleGenerateInvite(inviteRole)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${generatingInvite ? "animate-spin" : ""}`} />
                <span>Сгенерировать новую ссылку</span>
              </button>
            </div>

            {generatedInvite && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.url}
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono text-xs text-zinc-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInvite.url);
                      setCopiedInvite(true);
                      setTimeout(() => setCopiedInvite(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-900 dark:text-white transition-colors"
                  >
                    {copiedInvite ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedInvite ? "Скопировано!" : "Скопировать"}</span>
                  </button>
                  <a
                    href={generatedInvite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Открыть в Telegram</span>
                  </a>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  ⚠️ Ссылка является одноразовой и действует 24 часа. После перехода пользователь будет привязан к вашей компании.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Подключенные сотрудники компании ({teamMembers.length})</span>
            <button
              onClick={loadTeam}
              className="hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${loadingTeam ? "animate-spin" : ""}`} />
              <span>Обновить</span>
            </button>
          </div>

          {teamMembers.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
              <Users className="h-8 w-8 mx-auto opacity-40 text-amber-500" />
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                В служебном боте еще нет подключенных сотрудников
              </p>
              <p className="text-[11px] max-w-md mx-auto">
                Нажмите кнопку «Подключить Telegram / Пригласить», чтобы привязать ваш аккаунт. Первый подключившийся сотрудник автоматически становится руководителем (старшим сотрудником) с полными правами.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-all ${
                    m.is_active
                      ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/20">
                        {m.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {m.display_name}
                          </h4>
                          {m.role === "senior" ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Crown className="h-2.5 w-2.5" />
                              Старший
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                              Менеджер
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {m.telegram_username ? `@${m.telegram_username}` : `ID: ${m.telegram_user_id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteMember(m.id, m.display_name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        title="Удалить из команды"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Permissions & Controls */}
                  <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleInstructions(m)}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                          m.can_modify_instructions
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                        }`}
                        title="Может предлагать и утверждать новые правила, акции и цены в боте"
                      >
                        {m.can_modify_instructions ? "✓ Изменение правил" : "✕ Без прав на правила"}
                      </button>

                      {m.can_manage_team && (
                        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Управление командой
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`text-[10px] font-medium ${
                        m.is_active
                          ? "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          : "text-amber-600 dark:text-amber-400 font-semibold"
                      }`}
                    >
                      {m.is_active ? "Приостановить" : "Возобновить доступ"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirmation for Full Autopilot */}
      {showAutoConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Включение полного автопилота
                </h3>
                <p className="text-xs text-zinc-500">Instagram Direct (Live)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                <strong>Внимание:</strong> В режиме автопилота Вера будет отправлять все сгенерированные ответы клиентам в Direct <strong>напрямую без предварительного согласования</strong> в Telegram-боте.
              </p>
              <p className="text-[11px] text-zinc-500">
                Используйте этот режим, только если база знаний и каталог обуви полностью проверены и откалиброваны в симуляторе.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAutoConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => applyMode("auto")}
                disabled={togglingIg}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Да, включить автопилот</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
