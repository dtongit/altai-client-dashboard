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
  KnowledgeNode,
  CatalogItem,
  CatalogInventory,
  PromptModule,
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
  FolderTree,
  ShoppingBag,
  Tag,
  Search,
  Plus,
  Edit2,
  ExternalLink,
  X,
  ToggleLeft,
  ToggleRight,
  Box,
} from "lucide-react";

import { MarkdownView } from "@/components/markdown-view";

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
  const [activeTab, setActiveTab] = useState<
    "architect" | "prompt" | "modules" | "kb" | "catalog" | "tools" | "secrets"
  >("prompt");
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Dynamic Prompt Modules State
  const [promptModules, setPromptModules] = useState<PromptModule[]>([]);
  const [selectedModuleSlug, setSelectedModuleSlug] = useState<string | null>(null);
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<"all" | "global" | "tenant">("all");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<string>("all");
  const [moduleForm, setModuleForm] = useState({
    slug: "",
    name: "",
    category: "custom",
    override_mode: "replace",
    priority_order: 10,
    allowed_roles: "*",
    content: "",
    change_description: "",
  });
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Dynamic Knowledge Base (L0/L1/L2) State
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [kbTierFilter, setKbTierFilter] = useState<"all" | "L0" | "L1" | "L2">("all");
  const [kbSearch, setKbSearch] = useState("");
  const [nodeForm, setNodeForm] = useState({
    path: "",
    parent_path: "",
    title: "",
    tier: "L2",
    node_type: "article",
    summary: "",
    content: "",
    triggers_csv: "",
    media_csv: "",
    change_description: "",
  });
  const [isSavingNode, setIsSavingNode] = useState(false);

  // Dynamic Universal Catalog & Live Inventory State
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogInventory, setCatalogInventory] = useState<CatalogInventory[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    sku: "",
    title: "",
    category: "",
    base_price_rub: 0,
    description: "",
    media_csv: "",
    is_active: true,
  });
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [quickVariantSku, setQuickVariantSku] = useState<string | null>(null);
  const [quickVariantKey, setQuickVariantKey] = useState("");
  const [quickVariantQty, setQuickVariantQty] = useState(10);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

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

  const loadDynamicData = async () => {
    try {
      const [pmRes, knRes, ciRes, invRes] = await Promise.all([
        api.getPromptModules().catch(() => ({ ok: false, modules: [] })),
        api.getKnowledgeNodes().catch(() => ({ ok: false, nodes: [] })),
        api.getCatalogItems().catch(() => ({ ok: false, items: [] })),
        api.getCatalogInventory().catch(() => ({ ok: false, inventory: [] })),
      ]);
      if (pmRes.modules) setPromptModules(pmRes.modules);
      if (knRes.nodes) setKnowledgeNodes(knRes.nodes);
      if (ciRes.items) setCatalogItems(ciRes.items);
      if (invRes.inventory) setCatalogInventory(invRes.inventory);
    } catch (e: any) {
      console.error("Failed to load dynamic studio data:", e);
    }
  };

  const loadConfig = async (keepSelectedTool: boolean = true) => {
    try {
      const res = await api.getEmployeeConfig(employeeId);
      setConfig(res);
      await loadDynamicData();

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

  // -------------------------------------------------------------------------
  // Prompt Modules Handlers
  // -------------------------------------------------------------------------
  const handleToggleModule = async (m: PromptModule) => {
    try {
      await api.togglePromptModule(m.slug, !m.is_active);
      setPromptModules((prev) =>
        prev.map((item) =>
          item.slug === m.slug ? { ...item, is_active: !m.is_active } : item
        )
      );
      showToast("success", `Слой «${m.name}» ${!m.is_active ? "включен" : "отключен"}`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка переключения слоя");
    }
  };

  const handleStartEditModule = (m?: PromptModule) => {
    if (m) {
      setSelectedModuleSlug(m.slug);
      setModuleForm({
        slug: m.slug,
        name: m.name,
        category: m.category || "custom",
        override_mode: m.override_mode || "replace",
        priority_order: m.priority_order || 10,
        allowed_roles: m.allowed_roles?.join(", ") || "*",
        content: m.content || "",
        change_description: "",
      });
    } else {
      setSelectedModuleSlug(null);
      setModuleForm({
        slug: "",
        name: "",
        category: "custom",
        override_mode: "replace",
        priority_order: 10,
        allowed_roles: "*",
        content: "",
        change_description: "Создание нового слоя",
      });
    }
    setIsEditingModule(true);
  };

  const handleSaveModule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!moduleForm.slug.trim() || !moduleForm.name.trim()) {
      showToast("error", "Заполните слаг и название слоя");
      return;
    }
    setIsSavingModule(true);
    try {
      const rolesArr = moduleForm.allowed_roles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.upsertPromptModule({
        slug: moduleForm.slug.trim(),
        name: moduleForm.name.trim(),
        category: moduleForm.category.trim(),
        override_mode: moduleForm.override_mode,
        priority_order: Number(moduleForm.priority_order) || 10,
        allowed_roles: rolesArr.length ? rolesArr : ["*"],
        content: moduleForm.content,
        change_description: moduleForm.change_description || "Обновление слоя в веб-кабинете",
      });
      await loadDynamicData();
      setIsEditingModule(false);
      showToast("success", `Слой «${moduleForm.name}» успешно сохранен`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения слоя");
    } finally {
      setIsSavingModule(false);
    }
  };

  // -------------------------------------------------------------------------
  // Dynamic Knowledge Base Handlers
  // -------------------------------------------------------------------------
  const handleStartEditNode = (node?: KnowledgeNode) => {
    if (node) {
      setSelectedNodeId(node.id);
      setNodeForm({
        path: node.path,
        parent_path: node.parent_path || "",
        title: node.title,
        tier: node.tier || "L2",
        node_type: node.node_type || "article",
        summary: node.summary || "",
        content: node.content || "",
        triggers_csv: (node.high_confidence_triggers || []).join(", "),
        media_csv: (node.media_attachments || []).map((m: any) => m.url || m).join(", "),
        change_description: "",
      });
    } else {
      setSelectedNodeId(null);
      setNodeForm({
        path: "",
        parent_path: "",
        title: "",
        tier: "L2",
        node_type: "article",
        summary: "",
        content: "",
        triggers_csv: "",
        media_csv: "",
        change_description: "Создание нового узла",
      });
    }
    setIsEditingNode(true);
  };

  const handleSaveNode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nodeForm.path.trim() || !nodeForm.title.trim()) {
      showToast("error", "Укажите путь узла и заголовок");
      return;
    }
    setIsSavingNode(true);
    try {
      const triggers = nodeForm.triggers_csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const media = nodeForm.media_csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ type: "image", url }));
      await api.upsertKnowledgeNode({
        path: nodeForm.path.trim(),
        parent_path: nodeForm.parent_path.trim() || null,
        title: nodeForm.title.trim(),
        tier: nodeForm.tier,
        node_type: nodeForm.node_type || "article",
        summary: nodeForm.summary.trim(),
        content: nodeForm.content,
        high_confidence_triggers: triggers,
        media_attachments: media,
        change_description: nodeForm.change_description || "Обновление узла базы знаний",
      });
      await loadDynamicData();
      setIsEditingNode(false);
      showToast("success", `Узел «${nodeForm.title}» сохранен`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения узла");
    } finally {
      setIsSavingNode(false);
    }
  };

  const handleDeleteNode = async (node: KnowledgeNode) => {
    if (!confirm(`Удалить узел знаний «${node.title}» (${node.path})?`)) return;
    try {
      await api.deleteKnowledgeNode(node.id);
      if (selectedNodeId === node.id) setSelectedNodeId(null);
      await loadDynamicData();
      showToast("success", "Узел знаний удален");
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка при удалении узла");
    }
  };

  // -------------------------------------------------------------------------
  // Universal Catalog & Live Inventory Handlers
  // -------------------------------------------------------------------------
  const handleToggleInventory = async (
    sku: string,
    variantKey: string,
    currentStatus: boolean
  ) => {
    const newStatus = !currentStatus;
    // Optimistic UI update
    setCatalogInventory((prev) =>
      prev.map((inv) =>
        inv.sku === sku && inv.variant_key === variantKey
          ? { ...inv, is_available: newStatus }
          : inv
      )
    );
    try {
      await api.updateCatalogInventory({
        sku,
        variant_key: variantKey,
        is_available: newStatus,
      });
      showToast(
        "success",
        `Остаток ${sku} [${variantKey}]: ${newStatus ? "В наличии" : "Нет в наличии"}`
      );
    } catch (err: any) {
      setCatalogInventory((prev) =>
        prev.map((inv) =>
          inv.sku === sku && inv.variant_key === variantKey
            ? { ...inv, is_available: currentStatus }
            : inv
        )
      );
      showToast("error", err?.message || "Ошибка обновления наличия");
    }
  };

  const handleStartEditItem = (item?: CatalogItem) => {
    if (item) {
      setItemForm({
        sku: item.sku,
        title: item.title,
        category: item.category || "",
        base_price_rub: item.base_price_rub || 0,
        description: item.description || "",
        media_csv: (item.media_urls || []).join(", "),
        is_active: item.is_active,
      });
    } else {
      setItemForm({
        sku: "",
        title: "",
        category: "",
        base_price_rub: 0,
        description: "",
        media_csv: "",
        is_active: true,
      });
    }
    setIsEditingItem(true);
  };

  const handleSaveItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemForm.sku.trim() || !itemForm.title.trim()) {
      showToast("error", "Заполните артикул (SKU) и название");
      return;
    }
    setIsSavingItem(true);
    try {
      const mediaUrls = itemForm.media_csv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.upsertCatalogItem({
        sku: itemForm.sku.trim(),
        title: itemForm.title.trim(),
        category: itemForm.category.trim() || null,
        base_price_rub: Number(itemForm.base_price_rub) || 0,
        description: itemForm.description.trim() || null,
        media_urls: mediaUrls,
        is_active: itemForm.is_active,
      });
      await loadDynamicData();
      setIsEditingItem(false);
      showToast("success", `Товар «${itemForm.title}» сохранен`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка сохранения товара");
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleQuickAddVariant = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickVariantSku || !quickVariantKey.trim()) return;
    setIsAddingVariant(true);
    try {
      await api.updateCatalogInventory({
        sku: quickVariantSku,
        variant_key: quickVariantKey.trim(),
        is_available: true,
        quantity: Number(quickVariantQty) || 10,
      });
      await loadDynamicData();
      setQuickVariantKey("");
      setQuickVariantSku(null);
      showToast("success", `Вариант «${quickVariantKey.trim()}» добавлен в остатки`);
    } catch (err: any) {
      showToast("error", err?.message || "Ошибка добавления варианта");
    } finally {
      setIsAddingVariant(false);
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
                <span>Инструкции для Веры</span>
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
            onClick={() => setActiveTab("prompt")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "prompt"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Инструкция</span>
            {config?.prompt?.versions?.length ? (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                v{config.prompt.versions[0]?.version || 1}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("modules")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "modules"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Слои промптов</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {promptModules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("kb")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "kb"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" />
            <span>База знаний (Mind-Map)</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {knowledgeNodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Каталог и остатки</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {catalogItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("tools")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tools"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Навыки</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {config?.custom_tools?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("secrets")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "secrets"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Пароли ({config?.secrets?.length || 0})</span>
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
      {/* TAB 2: PROMPT & KNOWLEDGE BASE WITH VERSION JOURNAL                  */}
      {/* ==================================================================== */}
      {activeTab === "prompt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
            {/* Prompt Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Основная инструкция
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyPrompt(currentPromptText)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Скопировать текст инструкции"
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
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Вернуться к актуальной
                </button>
              </div>
            )}

            {/* Beautiful Markdown Rendering Box */}
            <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 p-6 overflow-y-auto max-h-[580px] select-text selection:bg-amber-500/30">
              <MarkdownView content={currentPromptText} />
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
      {/* TAB: MODULAR PROMPTS STUDIO                                          */}
      {/* ==================================================================== */}
      {activeTab === "modules" && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-500" />
                <span>Модульные слои системного промпта</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Иерархическая сборка: глобальная библиотека правил (безопасность, Ritz-Carlton, BANT) + персональные тенантные оверрайды.
              </p>
            </div>
            <button
              onClick={() => handleStartEditModule()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Создать слой</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              {(["all", "global", "tenant"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setModuleFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    moduleFilter === s
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {s === "all" ? "Все слои" : s === "global" ? "Глобальные" : "Тенантные"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-zinc-400">Категория:</span>
              <select
                value={moduleCategoryFilter}
                onChange={(e) => setModuleCategoryFilter(e.target.value)}
                className="text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="all">Все категории</option>
                <option value="personality">personality (Личность)</option>
                <option value="safety">safety (Безопасность)</option>
                <option value="sales_playbook">sales_playbook (Продажи)</option>
                <option value="objections">objections (Возражения)</option>
                <option value="role_boss">role_boss (Для руководства)</option>
                <option value="role_vision">role_vision (Мультимодальность)</option>
                <option value="custom">custom (Пользовательские)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 cols: Modules List */}
            <div className="lg:col-span-5 space-y-3">
              {promptModules
                .filter((m) => moduleFilter === "all" || m.scope === moduleFilter)
                .filter(
                  (m) =>
                    moduleCategoryFilter === "all" || m.category === moduleCategoryFilter
                )
                .map((m) => {
                  const isSelected = selectedModuleSlug === m.slug;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedModuleSlug(m.slug);
                        setIsEditingModule(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                m.scope === "global"
                                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {m.scope === "global" ? "Глобальный" : "Тенантный"}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              P: {m.priority_order}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              [{m.override_mode}]
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5">
                            {m.name}
                          </h3>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            {m.slug}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleModule(m);
                          }}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            m.is_active
                              ? "text-emerald-500 hover:bg-emerald-500/10"
                              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                          title={m.is_active ? "Отключить слой" : "Включить слой"}
                        >
                          {m.is_active ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] text-zinc-500">
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          {m.category}
                        </span>
                        {m.allowed_roles?.map((r) => (
                          <span
                            key={r}
                            className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono"
                          >
                            role: {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Right 7 cols: Detail or Editor */}
            <div className="lg:col-span-7">
              {isEditingModule ? (
                <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {selectedModuleSlug ? "Редактирование слоя" : "Новый слой промпта"}
                    </h3>
                    <button
                      onClick={() => setIsEditingModule(false)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveModule} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Слаг (ID слоя)
                        </label>
                        <input
                          type="text"
                          value={moduleForm.slug}
                          onChange={(e) =>
                            setModuleForm({ ...moduleForm, slug: e.target.value })
                          }
                          placeholder="special_discounts"
                          disabled={!!selectedModuleSlug}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Название слоя
                        </label>
                        <input
                          type="text"
                          value={moduleForm.name}
                          onChange={(e) =>
                            setModuleForm({ ...moduleForm, name: e.target.value })
                          }
                          placeholder="Специальные скидки"
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Категория
                        </label>
                        <input
                          type="text"
                          value={moduleForm.category}
                          onChange={(e) =>
                            setModuleForm({ ...moduleForm, category: e.target.value })
                          }
                          placeholder="custom"
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Режим оверрайда
                        </label>
                        <select
                          value={moduleForm.override_mode}
                          onChange={(e) =>
                            setModuleForm({ ...moduleForm, override_mode: e.target.value })
                          }
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        >
                          <option value="replace">replace (Заменить)</option>
                          <option value="append">append (Добавить в конец)</option>
                          <option value="prepend">prepend (Добавить в начало)</option>
                          <option value="disabled">disabled (Отключить)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Приоритет
                        </label>
                        <input
                          type="number"
                          value={moduleForm.priority_order}
                          onChange={(e) =>
                            setModuleForm({
                              ...moduleForm,
                              priority_order: parseInt(e.target.value) || 10,
                            })
                          }
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Разрешенные роли (через запятую, * для всех)
                      </label>
                      <input
                        type="text"
                        value={moduleForm.allowed_roles}
                        onChange={(e) =>
                          setModuleForm({ ...moduleForm, allowed_roles: e.target.value })
                        }
                        placeholder="client, boss, *"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Текст промпта (Markdown)
                      </label>
                      <textarea
                        value={moduleForm.content}
                        onChange={(e) =>
                          setModuleForm({ ...moduleForm, content: e.target.value })
                        }
                        rows={10}
                        placeholder="Инструкции и правила для модели..."
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Комментарий к изменению
                      </label>
                      <input
                        type="text"
                        value={moduleForm.change_description}
                        onChange={(e) =>
                          setModuleForm({
                            ...moduleForm,
                            change_description: e.target.value,
                          })
                        }
                        placeholder="Обновление условий доставки для Москвы"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingModule}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isSavingModule ? "Сохранение..." : "Сохранить слой"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingModule(false)}
                        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedModuleSlug ? (
                (() => {
                  const currentMod = promptModules.find((m) => m.slug === selectedModuleSlug);
                  if (!currentMod) return null;
                  return (
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                              {currentMod.name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                currentMod.scope === "global"
                                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {currentMod.scope === "global" ? "Глобальный" : "Тенантный"}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-zinc-400 mt-0.5">
                            {currentMod.slug}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyPrompt(currentMod.content)}
                            className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Копировать текст"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStartEditModule(currentMod)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>
                              {currentMod.scope === "global"
                                ? "Создать оверрайд"
                                : "Редактировать"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/60">
                        <span>
                          Категория: <strong>{currentMod.category}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Режим: <strong>{currentMod.override_mode}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Приоритет: <strong>{currentMod.priority_order}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Роли: <strong>{currentMod.allowed_roles?.join(", ") || "*"}</strong>
                        </span>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 text-xs">
                        <MarkdownView content={currentMod.content} />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
                  <Sliders className="h-10 w-10 stroke-1 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs">Выберите слой из списка слева для просмотра или настройки</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: DYNAMIC KNOWLEDGE BASE MIND-MAP (L0 / L1 / L2)                  */}
      {/* ==================================================================== */}
      {activeTab === "kb" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-amber-500" />
                <span>Динамическая база знаний (Mind-Map L0 / L1 / L2)</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                L0 — ядро диалога (всегда в контексте), L1 — оглавление тем, L2 — детальные статьи (подгружаются по триггерам).
              </p>
            </div>
            <button
              onClick={() => handleStartEditNode()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить узел</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              {(["all", "L0", "L1", "L2"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setKbTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    kbTierFilter === tier
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {tier === "all"
                    ? "Все уровни"
                    : tier === "L0"
                    ? "L0 (Ядро)"
                    : tier === "L1"
                    ? "L1 (Индекс)"
                    : "L2 (По требованию)"}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Поиск по пути, заголовку или триггерам..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 cols: Nodes list */}
            <div className="lg:col-span-5 space-y-3">
              {knowledgeNodes
                .filter((n) => kbTierFilter === "all" || n.tier === kbTierFilter)
                .filter((n) => {
                  if (!kbSearch.trim()) return true;
                  const q = kbSearch.toLowerCase();
                  return (
                    n.title.toLowerCase().includes(q) ||
                    n.path.toLowerCase().includes(q) ||
                    (n.high_confidence_triggers || []).some((t) => t.toLowerCase().includes(q))
                  );
                })
                .map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const tierColor =
                    node.tier === "L0"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : node.tier === "L1"
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setIsEditingNode(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierColor}`}
                        >
                          {node.tier}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                          {node.path}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5">
                        {node.title}
                      </h4>
                      {node.summary && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                          {node.summary}
                        </p>
                      )}
                      {node.high_confidence_triggers && node.high_confidence_triggers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {node.high_confidence_triggers.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                              #{t}
                            </span>
                          ))}
                          {node.high_confidence_triggers.length > 3 && (
                            <span className="text-[10px] text-zinc-400">
                              +{node.high_confidence_triggers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Right 7 cols: Detail / Form */}
            <div className="lg:col-span-7">
              {isEditingNode ? (
                <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {selectedNodeId ? "Редактирование узла" : "Новый узел базы знаний"}
                    </h3>
                    <button
                      onClick={() => setIsEditingNode(false)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveNode} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Путь в дереве (path)
                        </label>
                        <input
                          type="text"
                          value={nodeForm.path}
                          onChange={(e) =>
                            setNodeForm({ ...nodeForm, path: e.target.value })
                          }
                          placeholder="catalog/footwear/care"
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Родительский путь (optional)
                        </label>
                        <input
                          type="text"
                          value={nodeForm.parent_path}
                          onChange={(e) =>
                            setNodeForm({ ...nodeForm, parent_path: e.target.value })
                          }
                          placeholder="catalog/footwear"
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Заголовок
                        </label>
                        <input
                          type="text"
                          value={nodeForm.title}
                          onChange={(e) =>
                            setNodeForm({ ...nodeForm, title: e.target.value })
                          }
                          placeholder="Уход за кожаной обувью"
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                          Уровень контекста (Tier)
                        </label>
                        <select
                          value={nodeForm.tier}
                          onChange={(e) =>
                            setNodeForm({ ...nodeForm, tier: e.target.value })
                          }
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                        >
                          <option value="L0">L0 — Ядро диалога (всегда в промпте)</option>
                          <option value="L1">L1 — Индекс тем (для оглавления)</option>
                          <option value="L2">L2 — Детальная статья (по требованию)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Краткое резюме (Summary — для L1 оглавления)
                      </label>
                      <textarea
                        value={nodeForm.summary}
                        onChange={(e) =>
                          setNodeForm({ ...nodeForm, summary: e.target.value })
                        }
                        rows={2}
                        placeholder="Краткое описание темы в 1-2 предложения..."
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Триггеры авто-подгрузки (через запятую)
                      </label>
                      <input
                        type="text"
                        value={nodeForm.triggers_csv}
                        onChange={(e) =>
                          setNodeForm({ ...nodeForm, triggers_csv: e.target.value })
                        }
                        placeholder="уход за кожей, как чистить, обувной крем, водоотталкивающий спрей"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Медиа-вложения (ссылки на фото через запятую)
                      </label>
                      <input
                        type="text"
                        value={nodeForm.media_csv}
                        onChange={(e) =>
                          setNodeForm({ ...nodeForm, media_csv: e.target.value })
                        }
                        placeholder="https://example.com/shoes-care.jpg, https://example.com/size-guide.png"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Детальный контент статьи (Markdown)
                      </label>
                      <textarea
                        value={nodeForm.content}
                        onChange={(e) =>
                          setNodeForm({ ...nodeForm, content: e.target.value })
                        }
                        rows={8}
                        placeholder="Подробный текст статьи, инструкции, регламенты..."
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Описание изменения
                      </label>
                      <input
                        type="text"
                        value={nodeForm.change_description}
                        onChange={(e) =>
                          setNodeForm({
                            ...nodeForm,
                            change_description: e.target.value,
                          })
                        }
                        placeholder="Добавлены рекомендации по зимней пропитке"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSavingNode}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-40"
                      >
                        {isSavingNode ? "Сохранение..." : "Сохранить узел"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingNode(false)}
                        className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              ) : selectedNodeId ? (
                (() => {
                  const node = knowledgeNodes.find((n) => n.id === selectedNodeId);
                  if (!node) return null;
                  return (
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                node.tier === "L0"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : node.tier === "L1"
                                  ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              }`}
                            >
                              {node.tier}
                            </span>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                              {node.title}
                            </h3>
                          </div>
                          <div className="text-xs font-mono text-zinc-400 mt-1">
                            {node.path}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditNode(node)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Редактировать</span>
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node)}
                            className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Удалить узел"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {node.summary && (
                        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-300">
                          <strong>Резюме:</strong> {node.summary}
                        </div>
                      )}

                      {node.high_confidence_triggers && node.high_confidence_triggers.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Триггеры автоматической подгрузки:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {node.high_confidence_triggers.map((t) => (
                              <span
                                key={t}
                                className="text-xs px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {node.media_attachments && node.media_attachments.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Медиа-материалы для отправки клиенту:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {node.media_attachments.map((m: any, idx: number) => {
                              const url = typeof m === "string" ? m : m.url;
                              return (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-950 hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={url}
                                    alt="Media preview"
                                    className="w-full h-24 object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as any).style.display = "none";
                                    }}
                                  />
                                  <div className="p-1.5 text-[10px] text-zinc-500 truncate font-mono">
                                    {url}
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 text-xs">
                        <MarkdownView content={node.content} />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400">
                  <FolderTree className="h-10 w-10 stroke-1 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs">Выберите узел знаний из списка слева для просмотра или редактирования</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: UNIVERSAL CATALOG & LIVE INVENTORY                              */}
      {/* ==================================================================== */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-500" />
                <span>Универсальный каталог товаров и живые остатки</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Моментальное переключение наличия размеров и вариантов. Вера проверяет наличие перед подтверждением заказа.
              </p>
            </div>
            <button
              onClick={() => handleStartEditItem()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить товар</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Поиск по артикулу (SKU) или названию..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-zinc-400">Категория:</span>
              <select
                value={catalogCategoryFilter}
                onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                className="text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="all">Все категории</option>
                {Array.from(new Set(catalogItems.map((i) => i.category).filter(Boolean))).map(
                  (cat) => (
                    <option key={cat!} value={cat!}>
                      {cat}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Catalog Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {catalogItems
              .filter(
                (item) =>
                  catalogCategoryFilter === "all" || item.category === catalogCategoryFilter
              )
              .filter((item) => {
                if (!catalogSearch.trim()) return true;
                const q = catalogSearch.toLowerCase();
                return (
                  item.title.toLowerCase().includes(q) ||
                  item.sku.toLowerCase().includes(q) ||
                  (item.description || "").toLowerCase().includes(q)
                );
              })
              .map((item) => {
                const variants = catalogInventory.filter((inv) => inv.sku === item.sku);
                const hasMedia = item.media_urls && item.media_urls.length > 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Image / Media Preview */}
                      {hasMedia ? (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                          <img
                            src={item.media_urls![0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as any).style.display = "none";
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                              #{item.sku}
                            </span>
                            {item.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-1.5">
                            {item.title}
                          </h3>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-zinc-900 dark:text-white">
                            {item.base_price_rub != null
                              ? `${item.base_price_rub.toLocaleString("ru-RU")} ₽`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Live Inventory Matrix */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          <span>Наличие вариантов (размеры):</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickVariantSku(item.sku);
                              setQuickVariantKey("");
                              setQuickVariantQty(10);
                            }}
                            className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer lowercase"
                          >
                            <Plus className="h-3 w-3" />
                            <span>размер</span>
                          </button>
                        </div>

                        {variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {variants.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() =>
                                  handleToggleInventory(v.sku, v.variant_key, v.is_available)
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  v.is_available
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 line-through opacity-70 hover:opacity-100"
                                }`}
                                title={
                                  v.is_available
                                    ? `В наличии (нажмите, чтобы снять): ${v.variant_key}`
                                    : `Нет в наличии (нажмите, чтобы включить): ${v.variant_key}`
                                }
                              >
                                <span>{v.variant_key}</span>
                                {v.is_available ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <X className="h-3 w-3 text-zinc-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400 italic">
                            Варианты еще не добавлены
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {item.is_active ? "В каталоге" : "Скрыт"}
                      </span>
                      <button
                        onClick={() => handleStartEditItem(item)}
                        className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Изменить</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Quick Add Variant Modal */}
          {quickVariantSku && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Добавить размер / вариант для #{quickVariantSku}
                  </h3>
                  <button
                    onClick={() => setQuickVariantSku(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleQuickAddVariant} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Размер / Вариант (ключ)
                    </label>
                    <input
                      type="text"
                      value={quickVariantKey}
                      onChange={(e) => setQuickVariantKey(e.target.value)}
                      placeholder="38 (или Черный, M, 250 мл)"
                      autoFocus
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Количество (шт.)
                    </label>
                    <input
                      type="number"
                      value={quickVariantQty}
                      onChange={(e) => setQuickVariantQty(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isAddingVariant || !quickVariantKey.trim()}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-40"
                    >
                      {isAddingVariant ? "Добавление..." : "Добавить в остатки"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickVariantSku(null)}
                      className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit / Create Item Modal */}
          {isEditingItem && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {itemForm.sku ? `Товар #${itemForm.sku}` : "Новый товар"}
                  </h3>
                  <button
                    onClick={() => setIsEditingItem(false)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveItem} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Артикул (SKU)
                      </label>
                      <input
                        type="text"
                        value={itemForm.sku}
                        onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                        placeholder="TAL-001"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Категория
                      </label>
                      <input
                        type="text"
                        value={itemForm.category}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, category: e.target.value })
                        }
                        placeholder="Обувь / Ботильоны"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Название товара
                      </label>
                      <input
                        type="text"
                        value={itemForm.title}
                        onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                        placeholder="Кожаные ботильоны Velvet"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Базовая цена (₽)
                      </label>
                      <input
                        type="number"
                        value={itemForm.base_price_rub}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            base_price_rub: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="18500"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Ссылки на фото / медиа (через запятую)
                    </label>
                    <input
                      type="text"
                      value={itemForm.media_csv}
                      onChange={(e) => setItemForm({ ...itemForm, media_csv: e.target.value })}
                      placeholder="https://example.com/shoes-1.jpg, https://example.com/shoes-2.jpg"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Описание товара
                    </label>
                    <textarea
                      value={itemForm.description}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, description: e.target.value })
                      }
                      rows={3}
                      placeholder="Материал: натуральная кожа, подкладка байка..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="itemActive"
                      checked={itemForm.is_active}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, is_active: e.target.checked })
                      }
                      className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                    />
                    <label
                      htmlFor="itemActive"
                      className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                    >
                      Товар активен в каталоге и доступен Вере
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingItem}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-40"
                    >
                      {isSavingItem ? "Сохранение..." : "Сохранить товар"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingItem(false)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
                  <span>Навыки Веры</span>
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
                                handleDeleteTool(t.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
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
            </div>
          </div>

          {/* Right 8 cols: Detailed Readable Specification */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTool && toolExplanation ? (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-7 space-y-6 shadow-sm">
                {/* Tool Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {toolExplanation.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono text-[11px]">Системный ключ: {selectedTool.name}</span>
                      <span>•</span>
                      <span>Версия v{selectedTool.version || selectedTool.current_version || 1}</span>
                    </div>
                  </div>
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

                {/* 6. Changelog */}
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
              <span>Добавить пароль или ключ API</span>
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
              Сохраненные пароли и ключи ({config?.secrets?.length || 0})
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
