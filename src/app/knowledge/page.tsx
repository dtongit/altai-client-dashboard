"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { KnowledgeResponse } from "@/types";
import {
  BookOpen,
  FileText,
  DollarSign,
  HelpCircle,
  Send,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function KnowledgePage() {
  const { tenant } = useAuth();
  const [data, setData] = useState<KnowledgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "pricing" | "objections">("profile");

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

  const tabs = [
    { id: "profile", label: "Профиль и Tone-of-Voice", icon: FileText },
    { id: "pricing", label: "Прайс-лист и каталог", icon: DollarSign },
    { id: "objections", label: "Отработка возражений", icon: HelpCircle },
  ] as const;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-amber-400" />
            <span>База знаний ИИ-продавца</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Информация, регламенты и материалы, на которых обучена и которыми оперирует Вера
          </p>
        </div>

        <a
          href="https://t.me/altaioptima?text=Здравствуйте!%20Хочу%20внести%20обновления%20в%20базу%20знаний%20ИИ"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Предложить обновление</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Загрузка базы знаний...
          </div>
        ) : (
          <div className="prose prose-invert prose-xs max-w-none">
            <pre className="font-sans whitespace-pre-wrap text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-6 rounded-xl border border-zinc-800">
              {data ? data[activeTab] || "Материалы раздела формируются..." : "Данные недоступны"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
