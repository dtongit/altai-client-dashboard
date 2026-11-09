"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SystemStatusResponse, ChannelsResponse, ChannelMode, UmnicoStatus } from "@/types";
import ChannelCard from "./ChannelCard";
import InstagramCard from "./InstagramCard";
import UmnicoCard from "./UmnicoCard";
import TeamBotCard from "./TeamBotCard";
import { channelLabel, sortChannels } from "./channel-meta";
import {
  Building2,
  RefreshCw,
  Sliders,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const { tenant, user } = useAuth();
  const isSuperadmin = Boolean(user?.is_admin);
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [channelsData, setChannelsData] = useState<ChannelsResponse | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [umnicoStatus, setUmnicoStatus] = useState<UmnicoStatus | null>(null);
  const [umnicoOpened, setUmnicoOpened] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [modeErrors, setModeErrors] = useState<Record<string, string | undefined>>({});
  const [pendingAutoId, setPendingAutoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [res, ch, um] = await Promise.all([
        api.getSystemStatus().catch(() => null),
        api.getChannels().catch((e: any) => {
          setChannelsError(e?.message || "Не удалось загрузить каналы");
          return null;
        }),
        api.getUmnicoStatus().catch(() => null),
      ]);
      if (res) setStatusData(res);
      if (ch) {
        setChannelsData(ch);
        setChannelsError(null);
      }
      setUmnicoStatus(um);
    } catch (e) {
      console.error("Failed to load status:", e);
    } finally {
      setLoading(false);
    }
  };

  // Umnico is shown only to tenants that use it (token saved or a channel served through it); staff can open it.
  const showUmnico =
    umnicoOpened ||
    Boolean(umnicoStatus?.connected) ||
    Boolean(channelsData?.channels.some((c) => c.provider === "umnico"));

  const applyMode = async (id: string, mode: ChannelMode) => {
    setSavingIds((p) => ({ ...p, [id]: true }));
    setModeErrors((p) => ({ ...p, [id]: undefined }));
    try {
      const res = await api.setChannelMode(id, mode);
      const serverMode = res.mode ?? mode;
      setChannelsData((prev) =>
        prev ? { ...prev, channels: prev.channels.map((c) => (c.id === id ? { ...c, mode: serverMode } : c)) } : prev
      );
    } catch (err: any) {
      setModeErrors((p) => ({
        ...p,
        [id]: err?.message || "Не удалось изменить режим канала. Попробуйте ещё раз.",
      }));
    } finally {
      setSavingIds((p) => ({ ...p, [id]: false }));
      setPendingAutoId(null);
    }
  };

  const handleSelectMode = (id: string, mode: ChannelMode) => {
    const current = channelsData?.channels.find((c) => c.id === id);
    if (!current || current.mode === mode) return;
    if (mode === "auto") {
      setPendingAutoId(id);
      return;
    }
    void applyMode(id, mode);
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
          <span>Выключатели</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Управление каналами связи Веры, интеграциями и режимами автоответов
        </p>
      </div>

      {/* Connected Channels Grid */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Подключенные каналы
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Режим работы Веры в каждом канале. Выключенный канал только сохраняет сообщения клиентов в чатах, Вера в нём не отвечает
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

        {channelsError && !channelsData && (
          <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">{channelsError}</p>
        )}

        {channelsData && channelsData.channels.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Каналы пока не настроены</p>
        )}

        {channelsData && channelsData.channels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(() => {
              const sorted = sortChannels(channelsData.channels);
              const direct = sorted.find((c) => c.id === "instagram");
              const comments = sorted.find((c) => c.id === "instagram_comment");
              let igRendered = false;
              return sorted.map((ch) => {
                if (ch.id === "instagram" || ch.id === "instagram_comment") {
                  if (igRendered) return null;
                  igRendered = true;
                  return (
                    <InstagramCard
                      key="instagram"
                      direct={direct}
                      comments={comments}
                      autoAllowed={channelsData.auto_allowed}
                      savingIds={savingIds}
                      errors={modeErrors}
                      onSelect={handleSelectMode}
                    />
                  );
                }
                return (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    autoAllowed={channelsData.auto_allowed}
                    saving={Boolean(savingIds[ch.id])}
                    error={modeErrors[ch.id]}
                    onSelect={handleSelectMode}
                  />
                );
              });
            })()}
          </div>
        )}

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Любое ручное сообщение оператора ставит Веру на паузу в этом диалоге.
        </p>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Сотрудники компании и их связь с Верой в Telegram теперь в разделе «Команда и доступы».
      </p>

      {isSuperadmin && tenant && <TeamBotCard tenantId={tenant.id} />}

      {/* Integrations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Интеграции</h3>
          {!showUmnico && isSuperadmin && (
            <button
              type="button"
              onClick={() => setUmnicoOpened(true)}
              className="text-xs font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Подключить Umnico
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {showUmnico && (
            <UmnicoCard status={umnicoStatus} loading={loading} isSuperadmin={isSuperadmin} onChanged={loadStatus} />
          )}
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
        </div>
      </div>

      {/* Modal Confirmation for Full Autopilot */}
      {pendingAutoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Включение автопилота</h3>
                <p className="text-xs text-zinc-500">{channelLabel(pendingAutoId)}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                <strong>Внимание:</strong> в канале «{channelLabel(pendingAutoId)}» Вера будет отправлять ответы клиентам{" "}
                <strong>без предварительного согласования</strong>.
              </p>
              {pendingAutoId === "instagram_comment" && (
                <p>Ответы на комментарии публикуются публично: их увидят все, кто смотрит публикацию.</p>
              )}
              <p className="text-[11px] text-zinc-500">
                Включайте этот режим, только если база знаний проверена и ответы Веры откалиброваны в симуляторе.
              </p>
            </div>

            {modeErrors[pendingAutoId] && (
              <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-400">{modeErrors[pendingAutoId]}</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingAutoId(null)}
                disabled={Boolean(savingIds[pendingAutoId])}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => applyMode(pendingAutoId, "auto")}
                disabled={Boolean(savingIds[pendingAutoId])}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{savingIds[pendingAutoId] ? "Сохранение..." : "Да, включить автопилот"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
