"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTenantDisplayName } from "@/lib/tenants";
import { FormattedMessageText } from "@/components/formatted-message-text";
import {
  Send,
  RotateCcw,
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

export default function DemoChatClient({ initialTenantId }: { initialTenantId?: string }) {
  const pathname = usePathname();

  const detectedTenant = (() => {
    if (initialTenantId && initialTenantId.trim()) {
      return initialTenantId.trim();
    }
    if (pathname) {
      const match = pathname.match(/\/demo\/([^/?#]+)/);
      if (match && match[1] && match[1] !== "demo") {
        return match[1];
      }
    }
    return "kostis";
  })();

  const [tenantId, setTenantId] = useState<string>(detectedTenant);
  const [businessName, setBusinessName] = useState<string>("Загрузка...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("tenant");
      if (q && q.trim() && q.trim() !== tenantId) {
        setTenantId(q.trim());
        return;
      }
    }
    if (detectedTenant && detectedTenant !== tenantId) {
      setTenantId(detectedTenant);
    }
  }, [detectedTenant, pathname]);

  useEffect(() => {
    setMessages([]);
  }, [tenantId]);

  const displayTenant = getTenantDisplayName(tenantId, businessName);

  useEffect(() => {
    document.title = `Демо ALTAI Optima + ${displayTenant}`;
  }, [displayTenant]);

  // Lock document body scroll on mobile iOS/Android to guarantee zero outer page bouncing
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origPosition = document.body.style.position;
    const origWidth = document.body.style.width;
    const origHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.width = origWidth;
      document.body.style.height = origHeight;
    };
  }, []);

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
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden">
      {/* Minimalist Top Bar */}
      <header className="flex-none z-30 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex h-13 sm:h-16 items-center justify-between px-3 sm:px-6">
          {/* Brand info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="https://optima.altaiweb.online"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group transition-opacity hover:opacity-80 shrink-0"
              title="Перейти на сайт ALTAI Optima"
            >
              <img
                src="/brand_logo.webp"
                alt="ALTAI Optima"
                className="h-5 sm:h-6 w-auto object-contain dark:hidden"
              />
              <img
                src="/brand_logo_dark.webp"
                alt="ALTAI Optima"
                className="h-5 sm:h-6 w-auto object-contain hidden dark:block"
              />
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700 font-light select-none">/</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {businessName}
              </span>
            </div>
          </div>

          {/* Theme Toggle only */}
          <div className="flex items-center shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto p-0 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 border-0 sm:border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl shadow-none sm:shadow-sm overflow-hidden">
          {/* Chat Header inside card */}
          <div className="flex-none flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src="/avatar_eva_face.webp"
                  alt="Вера"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-amber-500/30"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-base font-bold text-zinc-900 dark:text-white">
                    Вера
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {businessName}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              title="Начать диалог сначала"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сбросить диалог</span>
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 overscroll-contain">
            {messages.length === 0 && !loading && (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-4 text-zinc-400 dark:text-zinc-500 select-none">
                <p className="text-sm font-medium">Начните диалог с Верой</p>
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
                    <FormattedMessageText text={m.text} isAssistant={isAssistant} />
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

          {/* Input Box */}
          <div className="flex-none p-2.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
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
                placeholder="Задайте любой вопрос по продукции, ценам или услугам..."
                disabled={loading}
                className="flex-1 px-3.5 sm:px-4 py-2.5 text-[16px] sm:text-base rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all placeholder:text-zinc-400"
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
            <div className="mt-1.5 sm:mt-2 text-center px-1 sm:px-2">
              <span className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                Это демо-версия Веры, созданная на основе открытых материалов компании {displayTenant}. Для точных ответов во всех сценариях нужна полноценная интеграция от{" "}
                <Link
                  href="https://optima.altaiweb.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  ALTAI Optima
                </Link>
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
