"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SystemStatusResponse } from "@/types";
import {
  Power,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  RefreshCw,
  Send,
  Sliders,
  Bell,
  Cpu,
} from "lucide-react";

export default function SettingsPage() {
  const { tenant, toggleActive } = useAuth();
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

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sliders className="h-6 w-6 text-amber-400" />
          <span>Каналы и управление системой</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Контроль глобальной активности ИИ-продавца, статусы мессенджеров и синхронизации с CRM
        </p>
      </div>

      {/* Master Emergency Switch Card */}
      <div className={`rounded-3xl border p-6 sm:p-8 transition-all ${
        isActive
          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-zinc-900 to-zinc-950"
          : "border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-900 to-zinc-950"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
                Главный рубильник ИИ-продавца
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {isActive ? "Вера активна во всех каналах" : "ИИ-продавец поставлен на глобальную паузу"}
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
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

      {/* Connected Channels Grid */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Подключенные каналы коммуникации
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Статусы коннекторов мессенджеров для приема заявок
            </p>
          </div>
          <button
            onClick={loadStatus}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Обновить статусы"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusData?.channels.map((ch) => (
            <div
              key={ch.name}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{ch.name}</span>
                {ch.configured ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
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
              <p className="text-[11px] text-zinc-400">{ch.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CRM Integration Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Синхронизация с CRM</h3>
              <p className="text-xs text-zinc-400">
                Автоматическое создание сделок и прикрепление BANT-саммари
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            amoCRM v4 подключена
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Тип CRM:</span>
            <span className="font-semibold uppercase">{statusData?.crm.type || "amoCRM"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Режим создания лида:</span>
            <span className="text-emerald-400">Complex Lead с передачей контакта и суммы</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Передача истории переписки:</span>
            <span className="text-zinc-300">Автоматически в примечание сделки</span>
          </div>
        </div>
      </div>

      {/* Staff Telegram Alert Setting */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">
              Мгновенные алерты команде в Telegram
            </h4>
            <p className="text-[11px] text-zinc-400">
              Оповещения директору и РОПу о горячих лидах, сбоях оплаты или ручном перехвате диалога
            </p>
          </div>
        </div>

        <a
          href="https://t.me/altaioptima"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
        >
          <Send className="h-3.5 w-3.5 text-sky-400" />
          <span>Настроить получателей</span>
        </a>
      </div>
    </div>
  );
}
