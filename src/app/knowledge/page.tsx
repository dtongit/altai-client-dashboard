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
  PromptVersionItem,
} from "@/types";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  CheckCircle2,
  FileText,
  History,
  KeyRound,
  Play,
  Trash2,
  AlertTriangle,
  Check,
  Layers,
  Cpu,
  ShieldCheck,
  Eye,
  Lock,
  Copy,
  Info,
  ArrowRight,
  Sliders,
  CheckCircle,
  HelpCircle,
  Calculator,
  Truck,
  Database,
} from "lucide-react";

interface StudioChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  actions?: ConfiguratorActionResult[];
}

interface ToolExplanation {
  title: string;
  badge: string;
  purpose: string;
  trigger: string;
  parameters: Array<{
    key: string;
    name: string;
    type: string;
    required: boolean;
    description: string;
    example: string;
    source: string;
  }>;
  algorithmSteps: string[];
  outputSummary: string;
  defaultInputs: Record<string, any>;
}

// Generate rich, human-readable business explanation for any tool without exposing raw code
function getToolExplanation(tool: CustomToolItem): ToolExplanation {
  const name = tool.name.toLowerCase();

  if (name.includes("wholesale") || name.includes("discount") || name.includes("quote")) {
    return {
      title: "Калькулятор оптовой стоимости и ступенчатых скидок",
      badge: "Ценообразование",
      purpose:
        "Автоматический мгновенный расчет точной стоимости оптовых заказов прямо во время диалога с покупателем. Применяет корпоративную сетку скидок в зависимости от объема партии без задержек и без привлечения старшего менеджера.",
      trigger:
        "Вера автоматически обращается к навыку, когда клиент интересуется оптовыми условиями, спрашивает про скидки от объема партии («сколько будет стоить 50 штук?», «какая цена при заказе партии?»).",
      parameters: [
        {
          key: "quantity",
          name: "Объем партии",
          type: "Число (шт.)",
          required: true,
          description: "Количество единиц товара, необходимое клиенту",
          example: "50 шт.",
          source: "Вера автоматически определяет из реплики клиента в диалоге",
        },
        {
          key: "unit_price",
          name: "Базовая цена за единицу",
          type: "Сумма в рублях (₽)",
          required: false,
          description: "Прайсовая стоимость единицы товара без скидки",
          example: "1 500 ₽",
          source: "Берется из утвержденного прайс-листа базы знаний",
        },
      ],
      algorithmSteps: [
        "Анализ реплики клиента и определение запрашиваемого объема продукции.",
        "Сопоставление объема со шкалой оптовых скидок: до 20 шт — базовый тариф (0%), от 20 до 99 шт — скидка 7%, от 100 шт — максимальная оптовая скидка 15%.",
        "Расчет итоговой стоимости партии за вычетом положенной скидки и округление суммы до целых рублей.",
        "Формирование структурированного коммерческого ответа с указанием точной суммы экономии клиента.",
      ],
      outputSummary:
        "Вера получает точную итоговую сумму заказа, процент скидки и сумму экономии клиента, после чего тепло и вежливо озвучивает расчет в диалоге и предлагает оформить счет или зафиксировать бронь.",
      defaultInputs: { quantity: 50, unit_price: 1500 },
    };
  }

  if (name.includes("shipping") || name.includes("delivery") || name.includes("доставк")) {
    return {
      title: "Калькулятор сроков и стоимости доставки",
      badge: "Логистика",
      purpose:
        "Быстрый расчет ориентировочной стоимости курьерской доставки и сроков прибытия заказа в город покупателя прямо в момент переписки.",
      trigger:
        "Срабатывает, когда клиент уточняет условия транспортировки («сколько стоит доставка в Казань?», «как быстро доедет до Екатеринбурга?»).",
      parameters: [
        {
          key: "city",
          name: "Город назначения",
          type: "Текст (название города)",
          required: true,
          description: "Населенный пункт получения заказа",
          example: "г. Казань",
          source: "Вера извлекает город из вопроса или адреса покупателя",
        },
        {
          key: "weight_kg",
          name: "Примерный вес посылки",
          type: "Число (кг)",
          required: false,
          description: "Расчетная масса отправления",
          example: "2.5 кг",
          source: "Определяется по спецификации выбранных товаров",
        },
      ],
      algorithmSteps: [
        "Определение тарифной зоны логистического оператора по указанному городу.",
        "Расчет базовой стоимости курьерской доставки или доставки до пункта выдачи (ПВЗ).",
        "Определение расчетного времени в пути в рабочих днях.",
        "Формирование итоговых условий доставки с предложением удобного варианта получения.",
      ],
      outputSummary:
        "Вера информирует клиента о сроках доставки в его город, стоимости отправления и предлагает удобный способ получения.",
      defaultInputs: { city: "Казань", weight_kg: 3 },
    };
  }

  // Generic dynamic explanation for custom tools
  const props = tool.parameters_schema?.properties || {};
  const requiredList: string[] = tool.parameters_schema?.required || [];
  const parsedParams = Object.keys(props).map((k) => {
    const p = props[k];
    const isNum = p.type === "number" || p.type === "integer";
    const isBool = p.type === "boolean";
    const typeLabel = isNum ? "Число" : isBool ? "Логический флаг" : "Текст";
    return {
      key: k,
      name: p.title || k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      type: typeLabel,
      required: requiredList.includes(k),
      description: p.description || "Параметр, передаваемый для вычислений",
      example: p.default !== undefined ? String(p.default) : isNum ? "100" : "Пример значения",
      source: "Автоматически извлекается Верой из диалога",
    };
  });

  const defaultInputs: Record<string, any> = {};
  for (const p of parsedParams) {
    if (p.type.includes("Число")) {
      defaultInputs[p.key] = 50;
    } else if (p.type.includes("Флаг")) {
      defaultInputs[p.key] = true;
    } else {
      defaultInputs[p.key] = "Тестовые данные";
    }
  }

  return {
    title: tool.description?.slice(0, 50) || tool.name.replace(/_/g, " "),
    badge: "Цифровой навык",
    purpose: tool.description || "Специализированный расчет для задач клиента.",
    trigger:
      "Вера применяет этот навык автоматически, когда в диалоге возникает необходимость выполнить действие или расчет в соответствии с назначением инструмента.",
    parameters: parsedParams.length > 0 ? parsedParams : [
      {
        key: "context",
        name: "Контекст диалога",
        type: "Текст",
        required: false,
        description: "Параметры текущей переписки",
        example: "Данные заказа",
        source: "Автоматически формируется Верой",
      },
    ],
    algorithmSteps: [
      "Распознавание входных данных из сообщений клиента во время живой переписки.",
      "Безопасная передача параметров в изолированную среду altai-sandboxd с нулевым хранением данных на диске.",
      "Выполнение формулы или запроса с защитой от сбоев и контролем таймаута (1.5 сек).",
      "Возврат проверенных цифр Вере для включения в естественный ответ покупателю.",
    ],
    outputSummary:
      "Формирует готовый структурированный результат, на основе которого Вера формулирует вежливый, аргументированный ответ покупателю.",
    defaultInputs,
  };
}

export default function EmployeeStudioPage() {
  const { tenant } = useAuth();
  const employeeId = "vera";

  const [config, setConfig] = useState<EmployeeConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"architect" | "prompt" | "tools" | "secrets">(
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
      text: "Здравствуйте! Я ИИ-Архитектор поведения и навыков Веры.\n\nВы можете поручить мне:\n• Скорректировать корпоративные правила, прайс-лист, скрипт квалификации или отработку возражений в системном регламенте Веры;\n• Настроить новый расчетный навык (например, калькулятор скидок, доставку или интеграцию с вашей CRM);\n• Обновить алгоритм любого существующего инструмента.\n\nЧто настроим для Веры?",
      time: "Сейчас",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 2. Read-only Prompt & Version Preview state
  const [viewingVersion, setViewingVersion] = useState<PromptVersionItem | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // 3. Human-Readable Tools state
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [testFormInputs, setTestFormInputs] = useState<Record<string, any>>({});
  const [sandboxOutput, setSandboxOutput] = useState<SandboxExecutionResult | null>(null);
  const [toolVersions, setToolVersions] = useState<CustomToolVersionItem[]>([]);
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

      if (res.custom_tools && res.custom_tools.length > 0) {
        if (!keepSelectedTool || !selectedToolId) {
          selectToolForView(res.custom_tools[0]);
        } else {
          const found = res.custom_tools.find((t) => t.id === selectedToolId);
          if (found) selectToolForView(found);
          else selectToolForView(res.custom_tools[0]);
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

  const selectToolForView = async (tool: CustomToolItem) => {
    setSelectedToolId(tool.id);
    const explanation = getToolExplanation(tool);
    setTestFormInputs(explanation.defaultInputs);
    setSandboxOutput(tool.last_test_output || null);
    try {
      const vRes = await api.getEmployeeToolVersions(employeeId, tool.id);
      setToolVersions(vRes.versions || []);
    } catch {
      setToolVersions([]);
    }
  };

  // Copy prompt text to clipboard
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Rollback prompt to previous version
  const handleRollbackPrompt = async (version: number) => {
    try {
      const res = await api.rollbackEmployeePrompt(employeeId, version);
      await loadConfig(true);
      setViewingVersion(null);
      showToast("success", res.message || `Регламент откачен к версии v${version}`);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось восстановить версию регламента");
    }
  };

  // Toggle tool active status
  const handleToggleTool = async (tool: CustomToolItem) => {
    try {
      await api.toggleEmployeeTool(employeeId, tool.id, !tool.is_active);
      await loadConfig(true);
      showToast(
        "success",
        `Навык «${tool.name}» ${!tool.is_active ? "активирован" : "приостановлен"}`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось изменить статус инструмента");
    }
  };

  // Delete tool
  const handleDeleteTool = async (toolId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот навык?")) return;
    try {
      await api.deleteEmployeeTool(employeeId, toolId);
      setSelectedToolId(null);
      await loadConfig(false);
      showToast("success", "Навык успешно удален");
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось удалить инструмент");
    }
  };

  // Test tool in isolated sandbox without raw code
  const handleRunToolTest = async () => {
    if (!selectedToolId) return;
    setIsRunningTest(true);
    try {
      const res = await api.testEmployeeTool(employeeId, selectedToolId, testFormInputs);
      setSandboxOutput(res.sandbox_test);
      if (res.sandbox_test?.ok) {
        showToast(
          "success",
          `Навык успешно протестирован в песочнице (${res.sandbox_test.duration_ms || 0} мс)`
        );
      } else {
        showToast("error", `Ошибка теста: ${res.sandbox_test?.error || "Проверьте параметры"}`);
      }
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка запуска проверки в песочнице");
    } finally {
      setIsRunningTest(false);
    }
  };

  // Send message to AI Architect
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

      const replyText = res.reply || res.response || "";
      const actionsList = res.actions_executed || res.actions || [];

      const assistantMsg: StudioChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: actionsList,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (res.prompt_updated || res.tools_updated || res.secrets_updated) {
        await loadConfig(false);
        showToast(
          "success",
          res.secrets_updated
            ? "ИИ-Архитектор сохранил ключ интеграции!"
            : res.tools_updated
            ? "ИИ-Архитектор обновил навык и проверил расчет в песочнице!"
            : "ИИ-Архитектор обновил системный регламент Веры!"
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

  // Save integration secret
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

  // Delete integration secret
  const handleDeleteSecret = async (keyName: string) => {
    if (!confirm(`Удалить ключ ${keyName}?`)) return;
    try {
      await api.deleteEmployeeSecret(employeeId, keyName);
      await loadConfig(true);
      showToast("success", `Ключ ${keyName} удален`);
    } catch (err: any) {
      showToast("error", err?.message || "Не удалось удалить секрет");
    }
  };

  const quickArchitectPrompts = [
    "Добавь в регламент скидку 10% при заказе от 300 000 руб.",
    "Настрой навык расчета курьерской доставки по весу и городу",
    "Усиль отработку возражения «Дорого» с акцентом на окупаемость",
    "Добавь в регламент квалификации вопрос про сроки запуска проекта",
  ];

  const selectedTool = config?.custom_tools?.find((t) => t.id === selectedToolId) || null;
  const toolExplanation = selectedTool ? getToolExplanation(selectedTool) : null;
  const currentPromptText = viewingVersion
    ? viewingVersion.content || ""
    : config?.prompt?.raw_markdown || "";

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
                <span>База знаний и Навыки: Вера</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Стандарт Ritz-Carlton
                </span>
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Зафиксированный регламент общения, стандарты сервиса и подробное описание цифровых навыков сотрудника
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
            <span>Регламент (Промпт)</span>
            {config?.prompt?.versions?.length ? (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                v{config.prompt.versions[0]?.version || 1}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("tools")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "tools"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Навыки и Инструменты</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
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
            <span>Ключи интеграций ({config?.secrets?.length || 0})</span>
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
                      Автоматическая настройка логики
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Опишите бизнес-задачу обычным языком — Архитектор скорректирует регламент или подключит нужный расчет
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      id: "welcome",
                      role: "assistant",
                      text: "Диалог очищен. Напишите, какие изменения внести в регламент или какой расчет настроить для Веры!",
                      time: "Сейчас",
                    },
                  ])
                }
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Очистить историю диалога"
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
                        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
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

                    {/* Action Cards executed by Configurator */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="pl-10 space-y-3">
                        {msg.actions.map((act, idx) => {
                          const isPromptUpdate =
                            act.action === "update_prompt" ||
                            (act as any).action_type === "prompt_updated";
                          const isToolUpdate =
                            act.action === "upsert_custom_tool" ||
                            (act as any).action_type === "code_updated";

                          return (
                            <div
                              key={idx}
                              className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 space-y-2.5 text-xs"
                            >
                              {isPromptUpdate && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                      <FileText className="h-4 w-4" />
                                      <span>
                                        {act.title ||
                                          `Регламент обновлен (версия v${
                                            act.new_version || act.version || 1
                                          })`}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setActiveTab("prompt")}
                                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Открыть регламент</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {(act.change_description || act.summary) && (
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                      {act.change_description || act.summary}
                                    </p>
                                  )}
                                </div>
                              )}

                              {isToolUpdate && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                      <Layers className="h-4 w-4" />
                                      <span>
                                        Навык настроен: {act.tool_name || "Калькулятор"}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setActiveTab("tools")}
                                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Перейти к описанию навыка</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {(act.summary || act.change_description) && (
                                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                      {act.summary || act.change_description}
                                    </p>
                                  )}
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Успешно проверен в изолированной песочнице</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                    <span>Архитектор обновляет логику и проверяет настройки...</span>
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
                placeholder="Например: «Добавь в регламент скидку 10% при заказе от 50 шт...»"
                disabled={isSendingChat}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSendingChat || !chatInput.trim()}
                className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Поручить</span>
              </button>
            </form>
          </div>

          {/* Right 4 cols: Active Skills & Prompt Version Overview */}
          <div className="lg:col-span-4 space-y-5">
            {/* Active Skills Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Активные навыки Веры ({config?.custom_tools?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("tools")}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Все навыки</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {config?.custom_tools && config.custom_tools.length > 0 ? (
                <div className="space-y-2.5">
                  {config.custom_tools.map((t) => {
                    const exp = getToolExplanation(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          selectToolForView(t);
                          setActiveTab("tools");
                        }}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 bg-zinc-50/70 dark:bg-zinc-950/50 cursor-pointer transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {exp.title}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              t.is_active ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                            title={t.is_active ? "Навык активен" : "Навык приостановлен"}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {exp.purpose}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                          <span className="font-mono">{t.name}</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Подробнее →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center space-y-2">
                  <p className="text-xs text-zinc-500">У Веры пока нет специализированных навыков</p>
                  <p className="text-[11px] text-zinc-400">
                    Напишите задачу Архитектору в чате слева, чтобы создать калькулятор или интеграцию
                  </p>
                </div>
              )}
            </div>

            {/* Prompt Versions Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Журнал версий регламента
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab("prompt")}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Регламент →
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {config?.prompt?.versions && config.prompt.versions.length > 0 ? (
                  config.prompt.versions.slice(0, 5).map((v) => (
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
                            {v.change_description || "Обновление регламента"}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString("ru-RU") : "Активна"}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setViewingVersion(v);
                          setActiveTab("prompt");
                        }}
                        className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0"
                      >
                        Открыть
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">Базовый регламент активен</p>
                )}
              </div>
            </div>

            {/* Hardware Isolation Guarantee */}
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Защищенная среда вычислений</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Все расчеты и интеграции выполняются в изолированной песочнице с нулевым хранением
                персональных данных на диске и защитой от сетевых угроз (152-ФЗ compliant).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: READ-ONLY PROMPT & KNOWLEDGE BASE WITH VERSION JOURNAL        */}
      {/* ==================================================================== */}
      {activeTab === "prompt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
            {/* Readonly Prompt Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Системный регламент и База Знаний Веры
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                    <Lock className="h-3 w-3" />
                    <span>Только чтение</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Зафиксированные правила общения, стандарты сервиса Ritz-Carlton, квалификация BANT и прайс-лист
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPrompt(currentPromptText)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Скопировать текст регламента"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Скопировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Read-only Banner Notification */}
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                <p className="font-semibold text-zinc-900 dark:text-white">
                  Регламент зафиксирован во избежание сбоев в работе продаж
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Прямое ручное редактирование отключено для гарантии надежности конверсии. Чтобы внести изменения в правила, прайс-лист или сценарии общения, поставьте задачу ИИ-Архитектору во вкладке «ИИ-Архитектор (Чат)».
                </p>
              </div>
            </div>

            {/* Notice if viewing an archive version */}
            {viewingVersion && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <History className="h-4 w-4 text-amber-500" />
                  <span>
                    Просмотр архивной версии: <strong>v{viewingVersion.version}</strong> (
                    {viewingVersion.change_description || "Архивная копия"})
                  </span>
                </div>
                <button
                  onClick={() => setViewingVersion(null)}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  Вернуться к актуальной
                </button>
              </div>
            )}

            {/* Read-only Text Box */}
            <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 p-5 font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed overflow-y-auto max-h-[560px] whitespace-pre-wrap select-text selection:bg-amber-500/30">
              {currentPromptText || "Регламент загружается..."}
            </div>
          </div>

          {/* Right 4 cols: Version History & Rollback */}
          <div className="lg:col-span-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <History className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Журнал версий регламента
              </h3>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              История каждого обновления базы знаний с возможностью просмотра и быстрого отката
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {config?.prompt?.versions && config.prompt.versions.length > 0 ? (
                config.prompt.versions.map((v) => {
                  const isCurrent =
                    !viewingVersion && v.version === config.prompt?.versions?.[0]?.version;
                  const isViewing = viewingVersion?.version === v.version;

                  return (
                    <div
                      key={v.version}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        isViewing
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs">
                            Версия v{v.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                              Активна
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingVersion(v)}
                            className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                          >
                            Просмотр
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleRollbackPrompt(v.version)}
                              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold transition-colors"
                              title="Восстановить эту версию как активную"
                            >
                              Откатить
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                        {v.change_description || "Плановое обновление базы знаний"}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Автор: {v.author || "Архитектор"}</span>
                        <span>
                          {v.created_at ? new Date(v.created_at).toLocaleString("ru-RU") : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Базовая версия регламента зафиксирована.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: HUMAN-READABLE TOOLS & DIGITAL SKILLS SPECIFICATION            */}
      {/* ==================================================================== */}
      {activeTab === "tools" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 cols: Skills Catalog */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span>Цифровые навыки Веры</span>
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {config?.custom_tools?.length || 0} подкл.
                </span>
              </div>

              <p className="text-xs text-zinc-500">
                Калькуляторы, формулы и правила, которые Вера автоматически применяет в диалогах
              </p>

              <div className="space-y-2.5">
                {config?.custom_tools && config.custom_tools.length > 0 ? (
                  config.custom_tools.map((t) => {
                    const isSelected = selectedToolId === t.id;
                    const exp = getToolExplanation(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => selectToolForView(t)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 shadow-sm"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white block leading-snug">
                              {exp.title}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400 mt-0.5 block">
                              {t.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTool(t);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                t.is_active
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                              }`}
                              title={t.is_active ? "Нажмите для паузы" : "Нажмите для включения"}
                            >
                              {t.is_active ? "ВКЛ" : "ПАУЗА"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTool(t.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              title="Удалить навык"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {exp.purpose}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Навыки пока не подключены.
                  </div>
                )}
              </div>

              {/* Request New Skill CTA */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setChatInput("Настрой новый навык для Веры: ");
                    setActiveTab("architect");
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Заказать новый навык у ИИ-Архитектора</span>
                </button>
              </div>
            </div>

            {/* Execution Hardware Guarantee */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Изолированная песочница altai-sandboxd</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Навыки исполняются в одноразовых безопасных контейнерах. Скорость вычислений — до 5 мс, полная защита данных клиентов и CRM.
              </p>
            </div>
          </div>

          {/* Right 8 cols: Detailed Readable Specification & Live Business Test */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTool && toolExplanation ? (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-7 space-y-6 shadow-sm">
                {/* Tool Title & Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {toolExplanation.title}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px] border border-amber-500/20">
                        {toolExplanation.badge}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          selectedTool.is_active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            selectedTool.is_active ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        <span>{selectedTool.is_active ? "Включен (Используется Верой)" : "Приостановлен"}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono text-[11px]">Системный ключ: {selectedTool.name}</span>
                      <span>•</span>
                      <span>Версия v{selectedTool.version || selectedTool.current_version || 1}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleTool(selectedTool)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      selectedTool.is_active
                        ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        : "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                    }`}
                  >
                    {selectedTool.is_active ? "Приостановить навык" : "Включить навык"}
                  </button>
                </div>

                {/* 1. Purpose */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>1. Назначение и бизнес-польза</span>
                  </h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/70 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                    {toolExplanation.purpose}
                  </p>
                </div>

                {/* 2. Triggers */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>2. Когда Вера применяет этот навык</span>
                  </h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/70 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                    {toolExplanation.trigger}
                  </p>
                </div>

                {/* 3. Parameters Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    <span>3. Входные параметры из диалога</span>
                  </h3>
                  <div className="space-y-2">
                    {toolExplanation.parameters.map((p) => (
                      <div
                        key={p.key}
                        className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">({p.key})</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                                p.required
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {p.required ? "Обязательный" : "Опциональный"}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {p.description} • {p.source}
                          </p>
                        </div>
                        <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                          Пример: {p.example}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Algorithm Walkthrough */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <span>4. Пошаговый алгоритм работы</span>
                  </h3>
                  <div className="space-y-2">
                    {toolExplanation.algorithmSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="flex h-5 w-5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Output Summary */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span>5. Что получает покупатель в ответе</span>
                  </h3>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/70 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                    {toolExplanation.outputSummary}
                  </p>
                </div>

                {/* 6. Live Interactive Test (Human-friendly parameters, NO CODE) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <Play className="h-4 w-4 text-emerald-500" />
                      <span>6. Проверка работы навыка в реальном времени</span>
                    </h3>
                    <span className="text-[11px] text-zinc-500">Безопасный тестовый запуск</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/70 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {toolExplanation.parameters.map((p) => (
                        <div key={p.key} className="space-y-1">
                          <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                            {p.name} ({p.key})
                          </label>
                          <input
                            type={p.type.includes("Число") ? "number" : "text"}
                            value={testFormInputs[p.key] ?? ""}
                            onChange={(e) =>
                              setTestFormInputs({
                                ...testFormInputs,
                                [p.key]: p.type.includes("Число")
                                  ? Number(e.target.value)
                                  : e.target.value,
                              })
                            }
                            placeholder={p.example}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleRunToolTest}
                      disabled={isRunningTest}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition-all disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isRunningTest ? "Вычисление..." : "Проверить расчет навыка"}</span>
                    </button>

                    {/* Result Card */}
                    {sandboxOutput && (
                      <div
                        className={`rounded-xl p-4 border space-y-2.5 text-xs transition-all ${
                          sandboxOutput.ok
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                            : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-2">
                            {sandboxOutput.ok ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span>
                              {sandboxOutput.ok
                                ? "Расчет выполнен успешно"
                                : "Ошибка при вычислении"}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-500">
                            Время ответа: {sandboxOutput.duration_ms ?? 0} мс
                          </span>
                        </div>

                        {sandboxOutput.error ? (
                          <p className="text-[11px] text-red-600 dark:text-red-300">
                            {sandboxOutput.error}
                          </p>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-semibold">
                              Результат, переданный Вере:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {sandboxOutput.result &&
                                typeof sandboxOutput.result === "object" &&
                                Object.entries(sandboxOutput.result).map(([k, val]) => (
                                  <div
                                    key={k}
                                    className="p-2.5 rounded-lg bg-white/70 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800 text-[11px]"
                                  >
                                    <div className="text-[10px] text-zinc-500 capitalize">
                                      {k.replace(/_/g, " ")}
                                    </div>
                                    <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
                                      {String(val)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Changelog */}
                {toolVersions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      История обновлений навыка
                    </h4>
                    <div className="space-y-1.5">
                      {toolVersions.map((tv) => (
                        <div
                          key={tv.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-500">v{tv.version}</span>
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {tv.change_description || "Плановое обновление параметров"}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400">
                            {tv.created_at ? new Date(tv.created_at).toLocaleDateString("ru-RU") : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-xs text-zinc-500">
                Выберите навык из списка слева, чтобы ознакомиться с его описанием и правилами работы.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: INTEGRATION SECRETS (CRM TOKENS, ERP KEYS)                    */}
      {/* ==================================================================== */}
      {activeTab === "secrets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              <span>Добавить ключ интеграции</span>
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              API-ключи и пароли передаются напрямую в изолированную защищенную песочницу и никогда не попадают в публичный контекст переписки.
            </p>

            <form onSubmit={handleSaveSecret} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Название ключа (UPPER_SNAKE_CASE)
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
                  Секретное значение (токен)
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
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
              >
                {isSavingSecret ? "Сохранение..." : "Сохранить ключ в защищенное хранилище"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Сохраненные ключи интеграций ({config?.secrets?.length || 0})
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
                        {s.key_name}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400 mt-0.5">
                        Значение: {s.masked_value}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSecret(s.key_name)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Удалить ключ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                Ключи интеграций еще не добавлены.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
