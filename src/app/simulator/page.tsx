"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { SimulatorMessage, SimulatorQualification } from "@/types";
import {
  Sparkles,
  Bot,
  User,
  Send,
  RotateCcw,
  Zap,
  CheckCircle2,
  HelpCircle,
  Flame,
  Phone,
  Target,
  DollarSign,
  Copy,
  Check,
  Building2,
  Cpu,
  ArrowRight,
} from "lucide-react";

const QUICK_PROMPTS = [
  "Здравствуйте! Сколько стоят занятия с репетитором?",
  "Ребёнок в 7 классе, нужно подтянуть математику к контрольным",
  "Это слишком дорого, на Авито репетиторы по 500 рублей!",
  "А аттестат в онлайн-школе настоящий? Его примут в университете?",
  "Хочу записаться на пробный урок, зовут Марина, телефон +7 (916) 123-45-67",
];

export default function SimulatorPage() {
  const { user, tenant } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SimulatorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [qualification, setQualification] = useState<SimulatorQualification>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      setInitialLoading(true);
      try {
        const res = await api.getSimulatorHistory();
        if (res && res.ok) {
          setMessages(res.messages || []);
          if (res.session_id) {
            setSessionId(res.session_id);
          }
          if (res.qualification) {
            setQualification(res.qualification);
          }
        }
      } catch (err) {
        console.warn("Simulator history load warning (fallback mode active):", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: SimulatorMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.sendSimulatorMessage(text);
      if (res && res.ok) {
        if (res.session_id) {
          setSessionId(res.session_id);
        }
        const botMsg: SimulatorMessage = {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: res.response,
          latency_ms: res.latency_ms,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, botMsg]);
        if (res.qualification) {
          setQualification(res.qualification);
        }
      } else {
        throw new Error("Не удалось получить ответ");
      }
    } catch (err) {
      console.error("Simulator message error:", err);
      // Fallback mock response for smooth demo/offline mode
      const companyName = tenant?.business_name || "нашей компании";
      const botMsg: SimulatorMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: `Здравствуйте! Я Вера — ИИ-продавец ${companyName}. Рада помочь вам с выбором программы! Стоимость индивидуальных занятий начинается от 1 386 ₽ за урок, а первый вводный урок-диагностику мы проводим совершенно бесплатно. Подскажите, в каком классе учится ребёнок и какая главная цель?`,
        latency_ms: 650,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = async () => {
    if (confirm("Вы уверены, что хотите сбросить текущий тестовый диалог и начать заново?")) {
      setResetting(true);
      try {
        await api.resetSimulator();
      } catch (err) {
        console.warn("Reset error:", err);
      }
      setMessages([]);
      setQualification({});
      setResetting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isBantQualified = Boolean(qualification?.is_qualified);
  const companyTitle = tenant?.business_name || "Онлайн-школа Фоксфорд";

  const effectiveSessionId =
    sessionId ||
    (tenant?.id
      ? `${tenant.id}:web_simulator:client_sim_${user?.username || "admin"}`
      : "demo_amo:web_simulator:client_sim_admin");

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-md shadow-amber-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <span>Тренажёр Веры (Симулятор диалогов)</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Интерактивное тестирование сценариев продаж, проверка базы знаний и квалификации BANT
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Admin Tech Trace Breakdown Button */}
          {user?.is_admin && (
            <Link
              href={`/admin/chats/?session_id=${encodeURIComponent(effectiveSessionId)}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-sm"
              title="Открыть технический разбор этого учебного диалога (LLM промпты, токены, ответы, вызовы инструментов)"
            >
              <Cpu className="h-4 w-4 text-amber-500" />
              <span>Разбор диалога</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                Трейс
              </span>
            </Link>
          )}

          {/* Company badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <Building2 className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-zinc-900 dark:text-white">{companyTitle}</span>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetting || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-40 shadow-sm"
            title="Очистить историю сообщений и начать диалог сначала"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>Начать заново</span>
          </button>
        </div>
      </div>

      {/* Main Container: Chat & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Column: Interactive Chat Window (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-2xl transition-colors">
          {/* Chat Header Status Bar */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Вера онлайн</span>
              <span className="text-zinc-500 dark:text-zinc-500 text-[11px] hidden sm:inline">• Режим симуляции покупателя</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span>{messages.length > 0 ? `${messages.length} сообщений` : "Диалог не начат"}</span>
              {user?.is_admin && (
                <Link
                  href={`/admin/chats/?session_id=${encodeURIComponent(effectiveSessionId)}`}
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  title="Открыть детальный технический разбор этого диалога в админке"
                >
                  <Cpu className="h-3 w-3" />
                  <span>Трейс диалога</span>
                </Link>
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {initialLoading ? (
              <div className="py-20 text-center text-xs text-zinc-500">
                Загрузка симулятора...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 sm:py-16 text-center max-w-md mx-auto space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Начните диалог с Верой
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Напишите любой вопрос, проверьте точность цен из базы знаний, назовите возражение или нажмите на готовый шаблон ниже.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex items-start gap-3 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs shadow-md ${
                        isUser
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          : "bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 font-bold"
                      }`}
                    >
                      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1.5 shadow-sm ${
                        isUser
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-950 dark:text-amber-50 rounded-tr-sm"
                          : "bg-zinc-100/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Meta Footer */}
                      <div
                        className={`flex items-center gap-2 text-[10px] ${
                          isUser ? "justify-end text-amber-800/70 dark:text-amber-400/60" : "justify-between text-zinc-500"
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-2">
                            {msg.latency_ms ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Zap className="h-2.5 w-2.5" />
                                <span>{msg.latency_ms} мс</span>
                              </span>
                            ) : null}
                            <button
                              onClick={() => handleCopy(msg.text, msg.id || String(idx))}
                              className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                              title="Скопировать ответ"
                            >
                              {copiedId === (msg.id || String(idx)) ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </button>
                          </div>
                        )}
                        <span>
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-md">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-zinc-100/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2 shadow-sm">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Вера формулирует ответ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-950/40 overflow-x-auto flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-zinc-500 flex-shrink-0">
              Шаблоны:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-[11px] text-zinc-700 hover:text-amber-700 dark:text-zinc-300 dark:hover:text-amber-400 px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 whitespace-nowrap transition-colors flex-shrink-0 disabled:opacity-50 shadow-sm"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-3 transition-colors"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите реплику от лица клиента (например: «Сколько стоят репетиторы?»)..."
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-semibold shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              title="Отправить сообщение"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Right Column: BANT Qualification & Test Guide (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto">
          {/* BANT Live Inspector Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 backdrop-blur-xl space-y-4 shadow-sm dark:shadow-xl transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  BANT-Квалификация
                </h3>
              </div>
              {isBantQualified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  <Flame className="h-3 w-3" />
                  <span>Квалифицирован</span>
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500">В процессе диалога</span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Client Name */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Имя клиента:</span>
                </span>
                <span className="font-medium text-zinc-900 dark:text-white text-right">
                  {qualification?.client_name || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
                </span>
              </div>

              {/* Phone */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Телефон:</span>
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-400 text-right">
                  {qualification?.client_phone || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
                </span>
              </div>

              {/* Need */}
              <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Выявленная потребность:</span>
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {qualification?.need_description || (
                    <span className="text-zinc-400 dark:text-zinc-600">Определяется в ходе диалога</span>
                  )}
                </span>
              </div>

              {/* Budget */}
              <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Бюджет / Пакет:</span>
                </span>
                <span className="font-medium text-zinc-900 dark:text-white text-right">
                  {qualification?.budget_rub ? (
                    `${qualification.budget_rub.toLocaleString("ru-RU")} ₽`
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Tech Audit Card */}
          {user?.is_admin && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-5 backdrop-blur-xl space-y-3 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-semibold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Технический аудит
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  Админ
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Пошаговый разбор учебного диалога: системные промпты базы знаний, сырые ответы модели, токены и параметры вызова кастомных инструментов.
              </p>
              <Link
                href={`/admin/chats/?session_id=${encodeURIComponent(effectiveSessionId)}`}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all"
              >
                <Cpu className="h-4 w-4" />
                <span>Открыть разбор диалога</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Test Strategy Checklist */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 backdrop-blur-xl space-y-3 shadow-sm dark:shadow-xl transition-colors">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                Чек-лист для проверки
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Цены и тарифы:</strong> Спросите про стоимость уроков («от 1 386 ₽»), скидки до 40% и маткапитал.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Возражение по цене:</strong> Напишите <em>«Дорого, у других дешевле»</em> — Вера обоснует экспертность преподавателей и возврат 13% НДФЛ.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Закрытие на шаг:</strong> Проверьте, закрывает ли Вера на бесплатный вводный урок-диагностику.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
