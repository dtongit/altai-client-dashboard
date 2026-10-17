"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  EmployeeConfigResponse,
  CustomToolItem,
  ConfiguratorActionResult,
  SandboxExecutionResult,
  CustomToolVersionItem,
} from "@/types";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  CheckCircle2,
  Code2,
  FileText,
  History,
  KeyRound,
  Play,
  Plus,
  Trash2,
  Save,
  Terminal,
  AlertTriangle,
  Check,
  Layers,
  Cpu,
  ShieldCheck,
} from "lucide-react";

interface StudioChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  actions?: ConfiguratorActionResult[];
}

const DEFAULT_TOOL_CODE = `// Кастомный навык ИИ-сотрудника (выполняется в изолированной песочнице altai-sandboxd)
// args — аргументы, переданные нейросетью при вызове инструмента
// ctx.secrets — ваши секретные ключи (например, ctx.secrets.CRM_TOKEN)
// safeFetch(url, options) — безопасный HTTP-клиент с защитой от SSRF

async function execute(args, ctx) {
  const qty = Number(args.quantity || 1);
  const basePrice = Number(args.unit_price || 1500);
  const discountPct = qty >= 100 ? 15 : qty >= 20 ? 7 : 0;
  const finalTotal = Math.round(qty * basePrice * (1 - discountPct / 100));

  console.log(\`Расчет партии: qty=\${qty}, скидка=\${discountPct}%\`);

  return {
    quantity: qty,
    unit_price_rub: basePrice,
    discount_pct: discountPct,
    total_rub: finalTotal,
    currency: "RUB",
    note: discountPct > 0 ? \`Применена оптовая скидка \${discountPct}%\` : "Базовый тариф"
  };
}`;

const DEFAULT_PARAMS_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      quantity: {
        type: "number",
        description: "Количество единиц товара",
      },
      unit_price: {
        type: "number",
        description: "Базовая цена за единицу в рублях",
      },
    },
    required: ["quantity"],
  },
  null,
  2
);

export default function EmployeeStudioPage() {
  const { tenant } = useAuth();
  const employeeId = "vera";

  const [config, setConfig] = useState<EmployeeConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"architect" | "prompt" | "code" | "secrets">(
    "architect"
  );
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 1. Configurator Architect Chat state
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Здравствуйте! Я ИИ-Архитектор поведения и кода Веры.\n\nВы можете поручить мне:\n• Изменить правила, прайс-лист, скрипт квалификации или отработку возражений в системном промпте Веры;\n• Написать и протестировать новый кастомный JS-инструмент (например, калькулятор доставки, расчет оптовой скидки или интеграцию с внешним API через песочницу `altai-sandboxd`).\n\nЧто настроим?",
      time: "Сейчас",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 2. Prompt & Knowledge Editor state
  const [promptMarkdown, setPromptMarkdown] = useState("");
  const [promptCommitMsg, setPromptCommitMsg] = useState("Обновление регламента через Студию");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // 3. Custom Code Tools (JS Sandbox) IDE state
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [toolName, setToolName] = useState("calculate_wholesale_quote");
  const [toolDesc, setToolDesc] = useState(
    "Рассчитывает стоимость оптового заказа со скидкой от объема"
  );
  const [toolSchemaText, setToolSchemaText] = useState(DEFAULT_PARAMS_SCHEMA);
  const [toolCode, setToolCode] = useState(DEFAULT_TOOL_CODE);
  const [toolIsActive, setToolIsActive] = useState(true);
  const [testPayloadText, setTestPayloadText] = useState(
    JSON.stringify({ quantity: 50, unit_price: 1200 }, null, 2)
  );
  const [sandboxOutput, setSandboxOutput] = useState<SandboxExecutionResult | null>(null);
  const [toolVersions, setToolVersions] = useState<CustomToolVersionItem[]>([]);
  const [isSavingTool, setIsSavingTool] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // 4. Secrets state
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretVal, setNewSecretVal] = useState("");
  const [isSavingSecret, setIsSavingSecret] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const loadConfig = async (keepSelectedTool: boolean = true) => {
    try {
      const res = await api.getEmployeeConfig(employeeId);
      setConfig(res);
      setPromptMarkdown(res.prompt?.raw_markdown || "");

      if (res.custom_tools && res.custom_tools.length > 0) {
        if (!keepSelectedTool || !selectedToolId) {
          selectToolIntoEditor(res.custom_tools[0]);
        } else {
          const found = res.custom_tools.find((t) => t.id === selectedToolId);
          if (found) selectToolIntoEditor(found);
        }
      }
    } catch (e: any) {
      console.error("Failed to load employee config:", e);
      showToast("error", e?.message || "Не удалось загрузить конфигурацию сотрудника");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig(false);
  }, [tenant?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSendingChat]);

  const selectToolIntoEditor = async (tool: CustomToolItem) => {
    setSelectedToolId(tool.id);
    setToolName(tool.name);
    setToolDesc(tool.description);
    setToolSchemaText(JSON.stringify(tool.parameters_schema || {}, null, 2));
    setToolCode(tool.code);
    setToolIsActive(tool.is_active);
    setSandboxOutput(tool.last_test_output || null);
    try {
      const vRes = await api.getEmployeeToolVersions(employeeId, tool.id);
      setToolVersions(vRes.versions || []);
    } catch {
      setToolVersions([]);
    }
  };

  const startNewTool = () => {
    setSelectedToolId(null);
    setToolName("custom_price_calculator");
    setToolDesc("Кастомный расчет стоимости и условий доставки для клиента");
    setToolSchemaText(DEFAULT_PARAMS_SCHEMA);
    setToolCode(DEFAULT_TOOL_CODE);
    setToolIsActive(true);
    setSandboxOutput(null);
    setToolVersions([]);
  };

  // ==========================================================================
  // Handlers: Architect Chat
  // ==========================================================================

  const handleSendChat = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const text = (preset || chatInput).trim();
    if (!text || isSendingChat) return;

    const userMsg: StudioChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      const historyPayload = chatMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const res = await api.sendConfiguratorChat(employeeId, text, historyPayload);

      const assistantMsg: StudioChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: res.actions_executed || [],
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (res.prompt_updated || res.tools_updated) {
        await loadConfig(false);
        showToast(
          "success",
          res.tools_updated
            ? "ИИ-Архитектор обновил и протестировал кастомный код в песочнице!"
            : "ИИ-Архитектор обновил системный промпт Веры!"
        );
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: `Ошибка при выполнении запроса: ${err?.message || "Неизвестная ошибка"}`,
          time: "Ошибка",
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // ==========================================================================
  // Handlers: Prompt & Rollback
  // ==========================================================================

  const handleSavePrompt = async () => {
    if (!promptMarkdown.trim() || isSavingPrompt) return;
    setIsSavingPrompt(true);
    try {
      const res = await api.updateKnowledge({
        raw_markdown: promptMarkdown,
        change_description: promptCommitMsg || "Ручное обновление промпта",
      });
      await loadConfig(true);
      showToast("success", `Сохранена версия v${res.version}: ${res.message}`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения промпта");
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleRollbackPrompt = async (version: number) => {
    try {
      const res = await api.rollbackEmployeePrompt(employeeId, version);
      await loadConfig(true);
      showToast("success", res.message);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось откатить версию промпта");
    }
  };

  // ==========================================================================
  // Handlers: Custom JS Tools & Sandbox
  // ==========================================================================

  const handleSaveAndTestTool = async () => {
    if (!toolName.trim() || !toolCode.trim() || isSavingTool) return;
    setIsSavingTool(true);
    try {
      let parsedSchema: Record<string, any> = { type: "object", properties: {} };
      try {
        parsedSchema = JSON.parse(toolSchemaText);
      } catch {
        showToast("error", "Некорректный JSON в схеме параметров (Parameters Schema)");
        setIsSavingTool(false);
        return;
      }

      let parsedTestPayload: Record<string, any> = {};
      try {
        parsedTestPayload = JSON.parse(testPayloadText || "{}");
      } catch {
        parsedTestPayload = {};
      }

      const res = await api.upsertEmployeeTool(employeeId, {
        name: toolName.trim(),
        description: toolDesc.trim(),
        parameters_schema: parsedSchema,
        code: toolCode,
        is_active: toolIsActive,
        change_description: "Сохранено и протестировано в IDE",
        test_payload: parsedTestPayload,
      });

      setSandboxOutput(res.sandbox_test);
      setSelectedToolId(res.tool.id);
      await loadConfig(true);
      const vRes = await api.getEmployeeToolVersions(employeeId, res.tool.id);
      setToolVersions(vRes.versions || []);

      if (res.sandbox_test?.ok) {
        showToast(
          "success",
          `Инструмент ${res.tool.name} (v${res.tool.version || res.tool.current_version || 1}) сохранен и успешно прошел тест в песочнице (${res.sandbox_test.duration_ms || 0} мс)!`
        );
      } else {
        showToast(
          "error",
          `Инструмент сохранен, но тест в песочнице вернул ошибку: ${res.sandbox_test?.error}`
        );
      }
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения инструмента");
    } finally {
      setIsSavingTool(false);
    }
  };

  const handleRunSandboxOnly = async () => {
    if (!selectedToolId) {
      await handleSaveAndTestTool();
      return;
    }
    setIsRunningTest(true);
    try {
      let parsedPayload: Record<string, any> = {};
      try {
        parsedPayload = JSON.parse(testPayloadText || "{}");
      } catch {
        showToast("error", "Некорректный JSON в тестовых аргументах (Test Payload)");
        setIsRunningTest(false);
        return;
      }
      const res = await api.testEmployeeTool(employeeId, selectedToolId, parsedPayload, toolCode);
      setSandboxOutput(res.sandbox_test);
      if (res.sandbox_test?.ok) {
        showToast(
          "success",
          `Код выполнен в altai-sandboxd за ${res.sandbox_test.duration_ms || 0} мс`
        );
      } else {
        showToast("error", `Ошибка выполнения: ${res.sandbox_test?.error}`);
      }
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка запуска в песочнице");
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleToggleTool = async (tool: CustomToolItem) => {
    try {
      await api.toggleEmployeeTool(employeeId, tool.id, !tool.is_active);
      await loadConfig(true);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось изменить статус инструмента");
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      await api.deleteEmployeeTool(employeeId, toolId);
      setSelectedToolId(null);
      await loadConfig(false);
      showToast("success", "Инструмент удален");
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось удалить инструмент");
    }
  };

  // ==========================================================================
  // Handlers: Secrets
  // ==========================================================================

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretKey.trim() || !newSecretVal.trim() || isSavingSecret) return;
    setIsSavingSecret(true);
    try {
      const res = await api.upsertEmployeeSecret(employeeId, newSecretKey, newSecretVal);
      setNewSecretKey("");
      setNewSecretVal("");
      await loadConfig(true);
      showToast("success", res.message);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения секрета");
    } finally {
      setIsSavingSecret(false);
    }
  };

  const handleDeleteSecret = async (keyName: string) => {
    try {
      await api.deleteEmployeeSecret(employeeId, keyName);
      await loadConfig(true);
      showToast("success", `Секрет ${keyName} удален`);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось удалить секрет");
    }
  };

  const quickArchitectPrompts = [
    "Добавь в регламент скидку 10% при заказе от 300 000 руб.",
    "Создай JS-инструмент calculate_shipping для расчета доставки по весу и городу",
    "Усиль отработку возражения «Дорого» с акцентом на окупаемость",
    "Напиши JS-инструмент roi_calculator для расчета экономии ФОТ клиента",
  ];

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Студия настройки и кода: Вера</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Rust Core + JS Sandbox
                </span>
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Управляйте промптами, версиями базы знаний и изолированными JS-навыками сотрудника через диалог с ИИ-Архитектором или напрямую в IDE
              </p>
            </div>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-200/70 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-300/60 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("architect")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "architect"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>ИИ-Архитектор (Чат)</span>
          </button>

          <button
            onClick={() => setActiveTab("prompt")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "prompt"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Промпт и Версии</span>
            {config?.prompt?.versions?.length ? (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10">
                v{config.prompt.versions[0]?.version || 1}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "code"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>JS-Навыки (Песочница)</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10">
              {config?.custom_tools?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("secrets")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "secrets"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Секреты ({config?.secrets?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Status Toast Banner */}
      {statusBanner && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-medium flex items-center justify-between border transition-all ${
            statusBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-[11px] underline opacity-75 hover:opacity-100"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: AI ARCHITECT CHAT + LIVE OVERVIEW                             */}
      {/* ==================================================================== */}
      {activeTab === "architect" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 cols: Interactive Architect Chat */}
          <div className="lg:col-span-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col h-[680px] overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Чат с ИИ-Архитектором Веры
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Прямой доступ к Промпту и JS-Песочнице
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Опишите задачу обычным языком — Архитектор сам внесет правки в промпт или напишет код инструмента
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      text: "Диалог очищен. Напишите, какие изменения внести в промпт или какой JS-инструмент создать для Веры!",
                      time: "Сейчас",
                    },
                  ])
                }
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Очистить историю чата"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-50/40 dark:bg-zinc-950/30">
              {chatMessages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={msg.id} className="space-y-3">
                    <div
                      className={`flex items-start gap-3 ${
                        isAssistant ? "" : "flex-row-reverse"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isAssistant
                            ? "bg-amber-500 text-zinc-950"
                            : "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900"
                        }`}
                      >
                        {isAssistant ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                          isAssistant
                            ? "bg-white dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/60"
                            : "bg-amber-500 text-zinc-950 font-medium"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <div
                          className={`mt-1.5 text-[10px] text-right ${
                            isAssistant ? "text-zinc-400" : "text-zinc-950/60"
                          }`}
                        >
                          {msg.time}
                        </div>
                      </div>
                    </div>

                    {/* Action Cards executed by the Configurator Agent */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="pl-10 space-y-3">
                        {msg.actions.map((act, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 space-y-2.5 text-xs"
                          >
                            {act.action === "update_prompt" && (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                    <FileText className="h-4 w-4" />
                                    <span>
                                      Системный промпт обновлен (версия v{act.new_version})
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setActiveTab("prompt")}
                                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                                  >
                                    Открыть промпт →
                                  </button>
                                </div>
                                {act.change_description && (
                                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                    {act.change_description}
                                  </p>
                                )}
                                {act.diff && (
                                  <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-48">
                                    {act.diff}
                                  </pre>
                                )}
                              </>
                            )}

                            {act.action === "upsert_custom_tool" && (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                                    <Code2 className="h-4 w-4" />
                                    <span>
                                      Кастомный JS-навык: {act.tool_name} (v{act.new_version})
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setActiveTab("code")}
                                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                                  >
                                    Открыть в IDE →
                                  </button>
                                </div>
                                {act.sandbox_test && (
                                  <div className="p-3 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-[11px] space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span
                                        className={
                                          act.sandbox_test.ok
                                            ? "text-emerald-400 font-bold"
                                            : "text-red-400 font-bold"
                                        }
                                      >
                                        {act.sandbox_test.ok
                                          ? "✓ SANDBOX TEST PASSED"
                                          : "✗ SANDBOX TEST FAILED"}
                                      </span>
                                      <span className="text-zinc-400">
                                        {act.sandbox_test.duration_ms || 0} ms
                                      </span>
                                    </div>
                                    <pre className="overflow-x-auto text-emerald-300">
                                      {JSON.stringify(
                                        act.sandbox_test.result ?? act.sandbox_test.error,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                )}
                              </>
                            )}

                            {act.action === "run_sandbox_test" && act.sandbox_test && (
                              <div className="space-y-1.5">
                                <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                  <Terminal className="h-4 w-4 text-amber-500" />
                                  <span>Тестовый запуск в песочнице: {act.tool_name}</span>
                                </div>
                                <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                                  {JSON.stringify(act.sandbox_test, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isSendingChat && (
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-xs text-zinc-500 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span>
                      Архитектор анализирует конфигурацию и тестирует изменения в песочнице...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 overflow-x-auto text-[11px]">
              {quickArchitectPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSendChat(undefined, p)}
                  disabled={isSendingChat}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => handleSendChat(e)}
              className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Например: «Добавь в прайс новую услугу...» или «Напиши JS-калькулятор доставки...»"
                disabled={isSendingChat}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Выполнить</span>
              </button>
            </form>
          </div>

          {/* Right 4 cols: Live Employee Snapshot (Active Tools + Recent Prompt Versions) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Active Custom Tools Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Активные JS-Навыки ({config?.custom_tools?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    startNewTool();
                    setActiveTab("code");
                  }}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Создать</span>
                </button>
              </div>

              {config?.custom_tools && config.custom_tools.length > 0 ? (
                <div className="space-y-2.5">
                  {config.custom_tools.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        selectToolIntoEditor(t);
                        setActiveTab("code");
                      }}
                      className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50/70 dark:bg-zinc-950/50 cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {t.name}()
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            v{t.version || t.current_version || 1}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              t.is_active ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center space-y-2">
                  <p className="text-xs text-zinc-500">
                    У Веры пока нет кастомных JS-инструментов
                  </p>
                  <button
                    onClick={() => {
                      startNewTool();
                      setActiveTab("code");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold"
                  >
                    Открыть песочницу кода
                  </button>
                </div>
              )}
            </div>

            {/* Recent Prompt Versions Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    История версий промпта
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("prompt")}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Редактор →
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {config?.prompt?.versions && config.prompt.versions.length > 0 ? (
                  config.prompt.versions.slice(0, 6).map((v) => (
                    <div
                      key={v.version}
                      className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            v{v.version}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300 truncate">
                            {v.change_description}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Автор: {v.author}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRollbackPrompt(v.version)}
                        className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0"
                        title={`Откатить промпт к версии v${v.version}`}
                      >
                        Откатить
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">Базовая версия промпта активна</p>
                )}
              </div>
            </div>

            {/* Isolation Hardware Guarantee Badge */}
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Аппаратная изоляция песочницы</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Кастомный JS-код выполняется на выделенном сервере{" "}
                <code className="font-mono text-emerald-700 dark:text-emerald-400">
                  altai-sandboxd
                </code>{" "}
                в изолированной ECMAScript VM с жестким лимитом 100 000 итераций цикла, защитой
                от SSRF и квотой памяти.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PROMPT & KNOWLEDGE BASE EDITOR + VERSION ROLLBACK             */}
      {/* ==================================================================== */}
      {activeTab === "prompt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Системный промпт и База Знаний Веры (Markdown)
                </h2>
                <p className="text-xs text-zinc-500">
                  Любое сохранение создает новую версию в истории с возможностью мгновенного отката
                </p>
              </div>
              <button
                onClick={handleSavePrompt}
                disabled={isSavingPrompt}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingPrompt ? "Сохранение..." : "Сохранить новую версию"}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Описание изменений (Commit Message)
              </label>
              <input
                type="text"
                value={promptCommitMsg}
                onChange={(e) => setPromptCommitMsg(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs text-zinc-900 dark:text-white"
                placeholder="Что изменилось в этой версии?"
              />
            </div>

            <textarea
              value={promptMarkdown}
              onChange={(e) => setPromptMarkdown(e.target.value)}
              rows={22}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 font-mono text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed focus:border-amber-500 focus:outline-none"
              placeholder="# БАЗА ЗНАНИЙ И ПРАВИЛА ПРОДАЖ..."
            />
          </div>

          <div className="lg:col-span-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Журнал версий промпта
              </h3>
            </div>
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {config?.prompt?.versions && config.prompt.versions.length > 0 ? (
                config.prompt.versions.map((v) => (
                  <div
                    key={v.version}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs">
                        Версия v{v.version}
                      </span>
                      <button
                        onClick={() => handleRollbackPrompt(v.version)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-200/80 hover:bg-amber-500 hover:text-zinc-950 dark:bg-zinc-800 dark:hover:bg-amber-500 dark:hover:text-zinc-950 text-[11px] font-semibold transition-colors"
                      >
                        Восстановить v{v.version}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {v.change_description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Автор: {v.author}</span>
                      <span>
                        {v.created_at ? new Date(v.created_at).toLocaleString("ru-RU") : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">
                  Сохраните первое изменение, чтобы начать вести версионность промпта.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CUSTOM CODE TOOLS (JS SANDBOX IDE)                            */}
      {/* ==================================================================== */}
      {activeTab === "code" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 cols: Tool List & Versions */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span>JS-Инструменты Веры</span>
                </h3>
                <button
                  onClick={startNewTool}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Новый навык</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {config?.custom_tools && config.custom_tools.length > 0 ? (
                  config.custom_tools.map((t) => {
                    const isSelected = selectedToolId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => selectToolIntoEditor(t)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {t.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-semibold">
                              v{t.version || t.current_version || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTool(t);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.is_active
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {t.is_active ? "ON" : "OFF"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTool(t.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-red-500"
                              title="Удалить инструмент"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {t.description}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    Список инструментов пуст. Создайте первый JS-навык справа!
                  </p>
                )}
              </div>
            </div>

            {/* Selected Tool Version History */}
            {toolVersions.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Версии кода инструмента
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {toolVersions.map((tv) => (
                    <div
                      key={tv.id}
                      className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-amber-500">v{tv.version}</span>
                        <span className="ml-2 text-zinc-600 dark:text-zinc-300">
                          {tv.change_description || "Обновление кода"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setToolCode(tv.code);
                          setToolSchemaText(
                            JSON.stringify(tv.parameters_schema || {}, null, 2)
                          );
                          showToast("success", `Код версии v${tv.version} загружен в редактор`);
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold hover:bg-amber-500 hover:text-zinc-950"
                      >
                        Загрузить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 8 cols: Code Editor + Sandbox Test Runner */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-amber-500" />
                    <span>
                      {selectedToolId
                        ? `Редактор навыка: ${toolName}`
                        : "Создание нового JS-навыка"}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Когда клиент в диалоге задает вопрос, требующий расчетов или внешнего API, Вера автоматически вызовет эту функцию
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunSandboxOnly}
                    disabled={isRunningTest || isSavingTool}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{isRunningTest ? "Запуск..." : "Тест в песочнице"}</span>
                  </button>

                  <button
                    onClick={handleSaveAndTestTool}
                    disabled={isSavingTool}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingTool ? "Сохранение..." : "Сохранить и протестировать"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Системное имя функции (snake_case)
                  </label>
                  <input
                    type="text"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs text-zinc-900 dark:text-white"
                    placeholder="calculate_shipping"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Описание для ИИ (когда вызывать инструмент)
                  </label>
                  <input
                    type="text"
                    value={toolDesc}
                    onChange={(e) => setToolDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs text-zinc-900 dark:text-white"
                    placeholder="Рассчитывает точную цену доставки..."
                  />
                </div>
              </div>

              {/* Code Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    JavaScript Код (ECMAScript Isolate — altai-sandboxd)
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    Лимит: 1500 мс | 100 000 итераций цикла | Память: 32 МБ
                  </span>
                </div>
                <textarea
                  value={toolCode}
                  onChange={(e) => setToolCode(e.target.value)}
                  rows={14}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Parameters JSON Schema & Test Payload side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    JSON Schema аргументов (Parameters Schema)
                  </label>
                  <textarea
                    value={toolSchemaText}
                    onChange={(e) => setToolSchemaText(e.target.value)}
                    rows={7}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-[11px] text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Тестовые аргументы (args для проверки в песочнице)
                  </label>
                  <textarea
                    value={testPayloadText}
                    onChange={(e) => setTestPayloadText(e.target.value)}
                    rows={7}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-[11px] text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              {/* Sandbox Execution Output Console */}
              {sandboxOutput && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-amber-400" />
                      <span
                        className={
                          sandboxOutput.ok
                            ? "text-emerald-400 font-bold"
                            : "text-red-400 font-bold"
                        }
                      >
                        {sandboxOutput.ok
                          ? "✓ ВЫПОЛНЕНО УСПЕШНО (altai-sandboxd)"
                          : "✗ ОШИБКА ВЫПОЛНЕНИЯ В ПЕСОЧНИЦЕ"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span>Время: {sandboxOutput.duration_ms ?? 0} мс</span>
                      {sandboxOutput.memory_kb ? (
                        <span>Память: {sandboxOutput.memory_kb} КБ</span>
                      ) : null}
                    </div>
                  </div>

                  {sandboxOutput.logs && sandboxOutput.logs.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase text-zinc-500">Консоль (console.log):</div>
                      {sandboxOutput.logs.map((line, i) => (
                        <div key={i} className="text-zinc-300 text-[11px]">
                          &gt; {line}
                        </div>
                      ))}
                    </div>
                  )}

                  {sandboxOutput.error ? (
                    <pre className="text-red-400 text-[11px] whitespace-pre-wrap">
                      {sandboxOutput.error}
                    </pre>
                  ) : (
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500 mb-1">
                        Возвращенный результат (return):
                      </div>
                      <pre className="text-emerald-300 text-[11px] overflow-x-auto">
                        {JSON.stringify(sandboxOutput.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: TENANT SECRETS (ctx.secrets)                                  */}
      {/* ==================================================================== */}
      {activeTab === "secrets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>Добавить секретный ключ</span>
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Секреты передаются напрямую в изолированную песочницу{" "}
              <code className="font-mono text-amber-600 dark:text-amber-400">
                ctx.secrets.KEY_NAME
              </code>{" "}
              при вызове ваших JS-инструментов и никогда не попадают в публичный промпт LLM.
            </p>

            <form onSubmit={handleSaveSecret} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Имя переменной (UPPER_SNAKE_CASE)
                </label>
                <input
                  type="text"
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value.toUpperCase())}
                  placeholder="MOYSKLAD_API_TOKEN"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Значение секрета
                </label>
                <input
                  type="password"
                  value={newSecretVal}
                  onChange={(e) => setNewSecretVal(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 font-mono text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingSecret || !newSecretKey.trim() || !newSecretVal.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20"
              >
                {isSavingSecret ? "Сохранение..." : "Сохранить секрет"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Сохраненные секреты окружения ({config?.secrets?.length || 0})
            </h3>
            {config?.secrets && config.secrets.length > 0 ? (
              <div className="space-y-2.5">
                {config.secrets.map((s) => (
                  <div
                    key={s.key_name}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                        ctx.secrets.{s.key_name}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 mt-0.5">
                        Значение: {s.masked_value}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSecret(s.key_name)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Удалить секрет"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                Секретные ключи еще не добавлены.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
