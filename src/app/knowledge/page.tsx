"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { KnowledgeResponse } from "@/types";
import {
  BookOpen,
  FileText,
  DollarSign,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Send,
  X,
  RotateCcw,
  Bot,
  User,
  CheckCircle2,
} from "lucide-react";

interface KnowledgeChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time?: string;
}

export default function KnowledgePage() {
  const { user, tenant } = useAuth();
  const [data, setData] = useState<KnowledgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "pricing" | "objections">("profile");

  // In-place chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<KnowledgeChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      text: "Здравствуйте! Я Вера, ваш ИИ-продавец. Напишите, какие изменения в регламентах, прайсе, товарах или ответах клиентам вы хотите обсудить или обновить. Я готова разобрать любой контекст!",
      time: "Сейчас",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = tenant?.id ? `knowledge_feedback_${tenant.id}` : undefined;

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await api.getKnowledge();
      setData(res);
    } catch (e) {
      console.error("Failed to load knowledge:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (presetText || inputText).trim();
    if (!textToSend || isSending) return;

    const userMsg: KnowledgeChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);

    try {
      const res = await api.sendSimulatorMessage(textToSend, sessionId);
      const assistantMsg: KnowledgeChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: res.response || "Принято к сведению. Я учту этот контекст в консультациях клиентов.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Failed to chat with Vera:", err);
      const errorMsg: KnowledgeChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "Произошла ошибка при отправке запроса. Пожалуйста, попробуйте еще раз.",
        time: "Ошибка",
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: "init",
        role: "assistant",
        text: "Здравствуйте! Я Вера, ваш ИИ-продавец. Напишите, какие изменения в регламентах, прайсе, товарах или ответах клиентам вы хотите обсудить или обновить. Я готова разобрать любой контекст!",
        time: "Сейчас",
      },
    ]);
  };

  const tabs = [
    { id: "profile", label: "Профиль и Tone-of-Voice", icon: FileText },
    { id: "pricing", label: "Прайс-лист и каталог", icon: DollarSign },
    { id: "objections", label: "Отработка возражений", icon: HelpCircle },
  ] as const;

  const quickPrompts = [
    "У нас обновились цены и условия",
    "Добавь новое спецпредложение для оптовиков",
    "Как ты сейчас отрабатываешь возражение «Дорого»?",
    "Уточни минимальную сумму заказа",
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-amber-500" />
            <span>База знаний ИИ-продавца</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Информация, регламенты и материалы, на которых обучена и которыми оперирует Вера
          </p>
        </div>

        {/* In-place Discussion Trigger Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-yellow-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Предложить обновление</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/30 font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Загрузка базы знаний...
          </div>
        ) : (
          <div className="prose prose-zinc dark:prose-invert prose-xs max-w-none">
            <pre className="font-sans whitespace-pre-wrap text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950/60 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {data ? data[activeTab] || "Материалы раздела формируются..." : "Данные недоступны"}
            </pre>
          </div>
        )}
      </div>

      {/* Interactive In-place Chat Modal with Vera */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-[640px] max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Обсуждение контекста и базы знаний с Верой
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      В сети
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Обсудите с Верой актуальные изменения, регламенты или специфику компании
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetChat}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Очистить диалог"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Закрыть окно"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/40 dark:bg-zinc-950/30">
              {chatMessages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isAssistant
                          ? "bg-amber-500 text-zinc-950 shadow-sm"
                          : "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900"
                      }`}
                    >
                      {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                        isAssistant
                          ? "bg-white dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/60"
                          : "bg-amber-500 text-zinc-950 font-medium"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.time && (
                        <div
                          className={`mt-1 text-[10px] text-right ${
                            isAssistant
                              ? "text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-950/60"
                          }`}
                        >
                          {msg.time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-xs text-zinc-500 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Вера формулирует ответ...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Chips */}
            <div className="px-6 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 overflow-x-auto text-[11px]">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendMessage(undefined, p)}
                  disabled={isSending}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Обсудите с Верой контекст или изменения в регламентах..."
                disabled={isSending}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 transition-all font-semibold shadow-md shadow-amber-500/20"
                title="Отправить сообщение"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
