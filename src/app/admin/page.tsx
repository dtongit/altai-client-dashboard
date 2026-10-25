"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AdminCrudResourceSchema } from "@/types";
import {
  Database,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Activity,
  Clock,
  Cpu,
  MessageSquare,
  Users,
} from "lucide-react";

const DEFAULT_TEMPLATES: Record<string, Record<string, any>> = {
  tenants: {
    id: "new_tenant",
    business_name: "Новая Компания",
    is_active: true,
    crm_type: "amocrm",
    crm_credentials: { mock: true },
    llm_provider: "openrouter",
    llm_model: "deepseek/deepseek-chat",
  },
  users: {
    username: "new_operator",
    email: "operator@company.ru",
    password: "ChangeMe123!",
    is_active: true,
    is_admin: false,
    role: "client_admin",
    tenant_id: "demo_amo",
  },
  "openrouter-models": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    context_length: 128000,
    pricing_prompt: "0.00000015",
    pricing_completion: "0.0000006",
    is_active: true,
  },
  prompts: {
    id: "tenant:new_tenant",
    prompt_type: "tenant",
    tenant_id: "new_tenant",
    title: "База знаний: Новая Компания",
    content: "# БАЗА ЗНАНИЙ\nОписание продуктов и правил...",
    author: "admin",
    change_description: "Инициализация",
  },
  "custom-tools": {
    tenant_id: "demo_amo",
    employee_id: "vera",
    name: "custom_calculator",
    description: "Расчет стоимости заказа",
    parameters_schema: { type: "object", properties: { qty: { type: "number" } } },
    code: "async function execute(args, ctx) {\n  return { total: (args.qty || 1) * 1000 };\n}",
    is_active: true,
  },
  campaigns: {
    name: "Осенняя B2B акция",
    tenant_id: "demo_amo",
    description: "Спецпредложение для оптовых клиентов",
    discount_pct: 10,
    promo_code: "ALTAI10",
    target_audience: "Оптовики",
    is_active: true,
  },
  feedbacks: {
    tenant_id: "demo_amo",
    session_id: "demo_session_1",
    rating: 5,
    comment: "Отличная консультация",
    category: "quality",
    is_resolved: false,
  },
  "training-runs": {
    run_Name: "SFT Run #1",
    base_model: "Qwen/Qwen2.5-7B-Instruct",
    status: "pending",
    epochs: 3,
    learning_rate: "2e-4",
  },
  "tester-templates": {
    author_username: "admin",
    name: "Сложный B2B клиент",
    category: "objection",
    persona_prompt: "Ты скептичный директор по закупкам...",
    opening_message: "Здравствуйте, почему у вас так дорого?",
    expected_behavior: "Отработать возражение через ROI",
    is_public: true,
  },
};

export default function SuperadminConsolePage() {
  const { user } = useAuth();
  const [schemas, setSchemas] = useState<AdminCrudResourceSchema[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>("tenants");
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<Record<string, any> | null>(null);

  // Modal state for Create / Edit / Inspect
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [jsonEditorText, setJsonEditorText] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const currentSchema = schemas.find((s) => s.resource === selectedResource);

  const loadSchemaAndStats = async () => {
    try {
      const [schemaRes, statsRes] = await Promise.all([
        api.getAdminCrudSchema(),
        api.getAdminStats().catch(() => null),
      ]);
      if (schemaRes.resources) {
        setSchemas(schemaRes.resources);
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (e: any) {
      showToast("error", e?.message || "Ошибка загрузки схемы БД");
    }
  };

  const loadResourceItems = async (resourceName: string, searchQuery: string = search) => {
    setLoading(true);
    try {
      const res = await api.listAdminCrud(resourceName, {
        search: searchQuery || undefined,
        limit: 100,
        offset: 0,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      showToast("error", e?.message || "Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemaAndStats();
  }, []);

  useEffect(() => {
    loadResourceItems(selectedResource, search);
  }, [selectedResource]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadResourceItems(selectedResource, search);
  };

  const openCreateModal = () => {
    const template = DEFAULT_TEMPLATES[selectedResource] || {};
    setModalMode("create");
    setEditingId(null);
    setJsonEditorText(JSON.stringify(template, null, 2));
    setModalOpen(true);
  };

  const openEditModal = (row: Record<string, any>) => {
    const pk = currentSchema?.primary_key || "id";
    setModalMode("edit");
    setEditingId(row[pk]);
    setJsonEditorText(JSON.stringify(row, null, 2));
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    setSaving(true);
    try {
      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(jsonEditorText);
      } catch {
        showToast("error", "Ошибка синтаксиса JSON");
        setSaving(false);
        return;
      }

      if (modalMode === "create") {
        await api.createAdminCrud(selectedResource, parsed);
        showToast("success", "Запись успешно создана в БД");
      } else if (editingId !== null) {
        await api.updateAdminCrud(selectedResource, editingId, parsed);
        showToast("success", `Запись #${editingId} успешно обновлена`);
      }

      setModalOpen(false);
      await loadResourceItems(selectedResource, search);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения записи");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    const pk = currentSchema?.primary_key || "id";
    const rowId = row[pk];
    if (rowId === undefined || rowId === null) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Удалить запись "${rowId}" из таблицы ${selectedResource}?`)
    ) {
      return;
    }

    try {
      await api.deleteAdminCrud(selectedResource, rowId);
      showToast("success", `Запись ${rowId} удалена`);
      await loadResourceItems(selectedResource, search);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось удалить запись");
    }
  };

  const formatCellValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-zinc-400 italic">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            val
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
          }`}
        >
          {val ? "TRUE" : "FALSE"}
        </span>
      );
    }
    if (typeof val === "object") {
      const s = JSON.stringify(val);
      return (
        <code className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
          {s.length > 48 ? `${s.slice(0, 48)}…` : s}
        </code>
      );
    }
    const str = String(val);
    return (
      <span className="truncate block max-w-[260px]" title={str}>
        {str.length > 64 ? `${str.slice(0, 64)}…` : str}
      </span>
    );
  };

  const visibleColumns =
    currentSchema?.columns ||
    (items.length > 0 ? Object.keys(items[0]).slice(0, 7) : ["id"]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Left Sidebar: 12 Database Resources */}
      <aside className="w-full lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/vera"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>В кабинет Веры</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
            SQLAdmin Rust
          </span>
        </div>

        <div className="px-2">
          <h1 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-500" />
            <span>СУПЕРАДМИН БД</span>
          </h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Прямое управление 12 таблицами `altai-core`
          </p>
        </div>

        <nav className="space-y-1">
          {schemas.map((res) => {
            const isSelected = res.resource === selectedResource;
            return (
              <button
                key={res.resource}
                onClick={() => {
                  setSelectedResource(res.resource);
                  setSearch("");
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  isSelected
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                <span className="truncate">{res.label}</span>
                {res.read_only && (
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded ${
                      isSelected
                        ? "bg-black/15 text-zinc-950"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    LOG
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 mt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <Link
            href="/admin/chats"
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all border border-amber-500/25"
          >
            <Cpu className="h-4 w-4 text-amber-500" />
            <span>Трейсы диалогов LLM</span>
          </Link>
          <Link
            href="/admin/team-chats"
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all border border-indigo-500/25"
          >
            <Users className="h-4 w-4 text-indigo-500" />
            <span>Командные боты и логи</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-x-hidden">
        {/* Top System Telemetry Bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Всего интеракций</div>
                <div className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  {stats.total_messages ?? 0}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Успешность (SLA)</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.success_rate_pct ?? 100}%
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Средняя задержка</div>
                <div className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  {Math.round(stats.average_latency_ms ?? 0)} мс
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Токены (Prompt / Comp)</div>
                <div className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  {(stats.total_prompt_tokens ?? 0).toLocaleString()} /{" "}
                  {(stats.total_completion_tokens ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Alert */}
        {toast && (
          <div
            className={`rounded-2xl px-4 py-3 text-xs font-medium flex items-center justify-between border ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span>{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-[11px] underline">
              Закрыть
            </button>
          </div>
        )}

        {/* Resource Header & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
              <span>{currentSchema?.label || selectedResource}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Всего: {total}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Таблица:{" "}
              <code className="font-mono text-amber-600 dark:text-amber-400">
                {selectedResource}
              </code>{" "}
              • Первичный ключ:{" "}
              <code className="font-mono">{currentSchema?.primary_key || "id"}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по JSON / полям..."
                className="pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:border-amber-500 focus:outline-none w-56"
              />
            </form>

            <button
              onClick={() => loadResourceItems(selectedResource, search)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              title="Обновить таблицу"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {!currentSchema?.read_only && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Создать запись</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  {visibleColumns.map((col) => (
                    <th key={col} className="py-3.5 px-4">
                      {col}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 1}
                      className="py-12 text-center text-zinc-500"
                    >
                      Загрузка записей...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 1}
                      className="py-12 text-center text-zinc-500"
                    >
                      Записи не найдены
                    </td>
                  </tr>
                ) : (
                  items.map((row, rIdx) => {
                    const pk = currentSchema?.primary_key || "id";
                    const rowKey = row[pk] ?? rIdx;
                    return (
                      <tr
                        key={String(rowKey)}
                        className="hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {visibleColumns.map((col) => (
                          <td key={col} className="py-3 px-4 align-middle">
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {selectedResource === "interaction-logs" && row.session_id && (
                              <Link
                                href={`/admin/chats/?session_id=${encodeURIComponent(row.session_id)}`}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-zinc-950 text-amber-700 dark:text-amber-400 text-[11px] font-semibold transition-colors inline-flex items-center gap-1 border border-amber-500/30"
                                title="Открыть технический трейс диалога"
                              >
                                <Cpu className="h-3 w-3 text-amber-500" />
                                <span>Трейс диалога</span>
                              </Link>
                            )}
                            <button
                              onClick={() => openEditModal(row)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-amber-500 hover:text-zinc-950 dark:bg-zinc-800 dark:hover:bg-amber-500 dark:hover:text-zinc-950 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>
                                {currentSchema?.read_only ? "JSON" : "Изменить"}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Удалить запись"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit JSON Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {modalMode === "create"
                    ? `Создание записи в ${selectedResource}`
                    : `Запись #${editingId} (${selectedResource})`}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Отредактируйте поля в формате JSON и нажмите «Сохранить в БД»
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                value={jsonEditorText}
                onChange={(e) => setJsonEditorText(e.target.value)}
                rows={18}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50 dark:bg-zinc-950">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                Закрыть
              </button>
              {!currentSchema?.read_only && (
                <button
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Сохранение..." : "Сохранить в БД"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
