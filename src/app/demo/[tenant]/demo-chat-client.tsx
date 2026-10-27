"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTenantDisplayName } from "@/lib/tenants";
import {
  Send,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Bot,
  BellRing,
  User as UserIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  escalation?: {
    escalated: boolean;
    reason: string;
    alert_preview?: string;
  } | null;
}

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  haier: [
    "Как работает программа рассрочки 0% и какие банки ее предоставляют?",
    "Как оформить бесплатную доставку и сертифицированный монтаж техники?",
    "Какие привилегии дает участие в клубе Haier Premium и приложение EVO?",
    "Чем отличаются дисконт-центры в «КухниПарк» и Озерецком от брендшопов?",
  ],

  lada_digit: [
    "Чем экосистема LADA Цифра полезна поставщикам и магазинам автозапчастей?",
    "Как устроен B2B-маркетплейс и интеграция с брендом LECAR?",
    "Как подключить автосервис (СТО) к единой цифровой системе?",
    "Как начать сотрудничество с LADA Цифра и какие условия для партнеров?",
  ],

  mediasafe: [
    "Чем MediaSafe отличается от Яндекс Метрики и Google Analytics?",
    "Как работает Pre-Bid API и за сколько миллисекунд принимается решение?",
    "Замедлит ли ваш счетчик скорость загрузки страниц нашего сайта?",
    "Сколько стоит начать и что входит в бесплатный тариф Start?",
  ],
  kostis: [
    "Какие фуршетные сеты посоветуете на 15–20 человек?",
    "Какая минимальная сумма и зоны доставки?",
    "Какие сейчас действуют промокоды и акции?",
    "Работаете ли вы с юрлицами по безналичному расчету?",
  ],
  tallora: [
    "Какие модели женской обуви есть 42 размера?",
    "Как осуществляется доставка с примеркой по Москве?",
    "Подойдет ли модель Aida на высокий подъем?",
  ],
};

const FALLBACK_SUGGESTIONS = [
  "Расскажите подробнее о вашей продукции и ценах",
  "Какие условия доставки и оплаты?",
  "Есть ли скидки на первый заказ?",
];

export default function DemoChatClient({ initialTenantId }: { initialTenantId: string }) {
  const tenantId = initialTenantId || "kostis";
  const [businessName, setBusinessName] = useState<string>("Загрузка...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>(
    DEFAULT_SUGGESTIONS[tenantId] || FALLBACK_SUGGESTIONS
  );

  const displayTenant = getTenantDisplayName(tenantId, businessName);

  useEffect(() => {
    document.title = `Демо ALTAI Optima + ${displayTenant}`;
  }, [displayTenant]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Generate or restore session
  useEffect(() => {
    const storageKey = `altai_demo_session_${tenantId}`;
    let saved = "";
    if (typeof window !== "undefined") {
      saved = localStorage.getItem(storageKey) || "";
    }
    if (!saved) {
      saved = `demo_${tenantId}_${Math.random().toString(36).substring(2, 10)}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, saved);
      }
    }
    setSessionId(saved);

    // Load tenant config
    async function init() {
      try {
        const config = await api.getDemoConfig(tenantId);
        if (config?.business_name) {
          setBusinessName(config.business_name);
        } else {
          setBusinessName(tenantId === "kostis" ? "ООО «КОСТИС»" : tenantId);
        }

        if (DEFAULT_SUGGESTIONS[tenantId]) {
          setSuggestions(DEFAULT_SUGGESTIONS[tenantId]);
        } else if (config?.suggested_questions?.length) {
          setSuggestions(config.suggested_questions);
        }
      } catch (err) {
        console.warn("Could not fetch remote demo config, using offline fallback:", err);
        setBusinessName(tenantId === "kostis" ? "ООО «КОСТИС»" : tenantId);
      }
    }

    init();
  }, [tenantId]);

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend ?? input;
    const trimmed = raw.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendDemoChat({
        tenant_id: tenantId,
        message: trimmed,
        session_id: sessionId || undefined,
      });

      if (res.session_id) {
        setSessionId(res.session_id);
        if (typeof window !== "undefined") {
          localStorage.setItem(`altai_demo_session_${tenantId}`, res.session_id);
        }
      }

      const botMsg: Message = {
        id: `a_${Date.now()}`,
        sender: "assistant",
        text: res.assistant_response || "Спасибо за обращение! Менеджер свяжется с вами.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        escalation: res.escalation,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "assistant",
        text: err?.message || "Извините, произошла временная ошибка связи. Пожалуйста, попробуйте еще раз.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleReset = () => {
    const newSession = `demo_${tenantId}_${Math.random().toString(36).substring(2, 10)}`;
    setSessionId(newSession);
    if (typeof window !== "undefined") {
      localStorage.setItem(`altai_demo_session_${tenantId}`, newSession);
    }
    setMessages([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Minimalist Top Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <Link
              href="https://optima.altaiweb.online"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group transition-opacity hover:opacity-80"
              title="Перейти на сайт ALTAI Optima"
            >
              <img
                src="/brand_logo.webp"
                alt="ALTAI Optima"
                className="h-6 w-auto object-contain dark:hidden"
              />
              <img
                src="/brand_logo_dark.webp"
                alt="ALTAI Optima"
                className="h-6 w-auto object-contain hidden dark:block"
              />
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700 font-light select-none">/</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-[320px]">
                {businessName}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="https://optima.altaiweb.online"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <span>О платформе</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col">
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Chat Header inside card */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/avatar_eva_face.webp"
                  alt="Вера"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Вера
                  </h1>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {businessName}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Начать диалог сначала"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сбросить диалог</span>
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-4 text-zinc-400 dark:text-zinc-500 select-none">
                <p className="text-sm">Задайте вопрос или выберите тему ниже</p>
              </div>
            )}
            {messages.map((m) => {
              const isAssistant = m.sender === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 sm:gap-3 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <img
                      src="/avatar_eva_face.webp"
                      alt="Вера"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-amber-500/20 shrink-0 mt-0.5"
                    />
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm sm:text-[15px] leading-relaxed transition-all ${
                      isAssistant
                        ? "bg-zinc-100/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-zinc-200/50 dark:border-zinc-700/50"
                        : "bg-amber-500 text-white rounded-tr-sm shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    {m.escalation && (
                      <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 p-2.5 sm:p-3 text-xs space-y-1.5 transition-all text-left">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                          <BellRing className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Симуляция эскалации менеджеру (Human-in-the-Loop)</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                          В боевом мессенджере диалог ставится на паузу, а в Telegram-бот команды отправляется карточка:
                        </p>
                        <div className="rounded-lg bg-white/90 dark:bg-zinc-950/80 border border-amber-500/25 px-2.5 py-1.5 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed shadow-xs">
                          {m.escalation.alert_preview || `🚨 Срочный вопрос от клиента!\n💬 Суть: ${m.escalation.reason}`}
                        </div>
                        <p className="text-[10px] text-amber-700/90 dark:text-amber-400/90 italic">
                          💡 На демо-стенде диалог не блокируется — вы можете продолжить общение с Верой.
                        </p>
                      </div>
                    )}
                    <div
                      className={`text-[10px] mt-1 text-right select-none ${
                        isAssistant
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-amber-100"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                  {!isAssistant && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-600 dark:text-amber-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5 sm:gap-3">
                <img
                  src="/avatar_eva_face.webp"
                  alt="Вера"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-amber-500/20 shrink-0 mt-0.5"
                />
                <div className="bg-zinc-100/90 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-zinc-400 ml-1.5 select-none">Вера печатает...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt chips (suggestions) */}
          {suggestions.length > 0 && messages.length <= 3 && (
            <div className="px-4 sm:px-6 pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40">
              <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Быстрые вопросы:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pb-2">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Задайте любой вопрос по меню, ценам или доставке..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm sm:text-base rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white font-medium text-sm transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                title="Отправить сообщение (Enter)"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline sm:ml-2">Отправить</span>
              </button>
            </form>
            <div className="mt-2 text-center px-2">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                Это демо-версия Веры, созданная на основе открытых материалов компании {displayTenant}. Для точных ответов во всех сценариях нужна{" "}
                <Link
                  href="https://optima.altaiweb.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  полноценная интеграция от ALTAI Optima
                </Link>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
