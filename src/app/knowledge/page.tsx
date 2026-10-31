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
  PromptModule,
  SemanticSkillCard,
  TenantSecretMasked,
  PromptPreviewResponse,
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
  Code,
  ChevronDown,
  ChevronUp,
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
  const [activeTab, setActiveTab] = useState<"prompts" | "kb" | "skills">("prompts");
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

  // Live Prompt Preview Modal State
  const [promptPreview, setPromptPreview] = useState<PromptPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  // Semantic Skill Cards & Integrations State
  const [skillCards, setSkillCards] = useState<SemanticSkillCard[]>([]);
  const [selectedCardSlug, setSelectedCardSlug] = useState<string>("tilda_moysklad");
  const [editingCardRules, setEditingCardRules] = useState<string>("");
  const [isSavingCardRules, setIsSavingCardRules] = useState(false);
  const [cardSecretKey, setCardSecretKey] = useState("");
  const [cardSecretVal, setCardSecretVal] = useState("");
  const [revealedToolCodes, setRevealedToolCodes] = useState<Record<string, boolean>>({});
  const [copiedPreview, setCopiedPreview] = useState(false);

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
      const [pmRes, knRes, cardsRes] = await Promise.all([
        api.getPromptModules().catch(() => ({ ok: false, modules: [] })),
        api.getKnowledgeNodes().catch(() => ({ ok: false, nodes: [] })),
        api.getSkillCards().catch(() => ({ ok: false, cards: [] })),
      ]);
      if (pmRes.modules) setPromptModules(pmRes.modules);
      if (knRes.nodes) setKnowledgeNodes(knRes.nodes);
      if (cardsRes.cards) {
        setSkillCards(cardsRes.cards);
        if (cardsRes.cards.length > 0) {
          const current = cardsRes.cards.find((c) => c.group_slug === selectedCardSlug) || cardsRes.cards[0];
          setSelectedCardSlug(current.group_slug);
          setEditingCardRules(current.prompt_rules || "");
        }
      }
    } catch (e: any) {
      console.error("Failed to load dynamic studio data:", e);
    }
  };

  const selectCard = (card: SemanticSkillCard) => {
    setSelectedCardSlug(card.group_slug);
    setEditingCardRules(card.prompt_rules || "");
  };

  const handleSaveCardRules = async () => {
    if (!selectedCardSlug) return;
    setIsSavingCardRules(true);
    try {
      await api.saveSkillCard({
        group_slug: selectedCardSlug,
        prompt_rules: editingCardRules,
      });
      showToast("success", "Правила навыка успешно сохранены!");
      await loadDynamicData();
    } catch (e: any) {
      showToast("error", e?.message || "Ошибка сохранения правил навыка");
    } finally {
      setIsSavingCardRules(false);
    }
  };

  const handleAddSecretToCard = async () => {
    if (!selectedCardSlug || !cardSecretKey.trim() || !cardSecretVal.trim()) return;
    try {
      await api.saveSkillCard({
        group_slug: selectedCardSlug,
        secrets: [
          {
            key_name: cardSecretKey.trim().toUpperCase(),
            value: cardSecretVal.trim(),
          },
        ],
      });
      setCardSecretKey("");
      setCardSecretVal("");
      showToast("success", `Ключ ${cardSecretKey.trim().toUpperCase()} сохранен в карточке!`);
      await loadDynamicData();
    } catch (e: any) {
      showToast("error", e?.message || "Ошибка сохранения ключа");
    }
  };

  const handleFetchPromptPreview = async () => {
    setLoadingPreview(true);
    setShowPreviewModal(true);
    try {
      const res = await api.getPromptPreview({
        employee: "vera",
        role: "client",
        channel: "telegram",
      });
      setPromptPreview(res);
    } catch (e: any) {
      showToast("error", e?.message || "Ошибка загрузки предпросмотра промпта");
    } finally {
      setLoadingPreview(false);
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

        {/* Studio Navigation Tabs: Strictly 3 Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-200/70 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-300/60 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("prompts")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "prompts"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Промпты</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {promptModules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("kb")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "kb"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <FolderTree className="h-4 w-4" />
            <span>База знаний (Mind-Map)</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {knowledgeNodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "skills"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Навыки и интеграции</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/10 dark:bg-white/10 font-bold">
              {skillCards.length}
            </span>
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
      {/* TAB 1: MODULAR PROMPTS STUDIO & LIVE PREVIEW                          */}
      {/* ==================================================================== */}
      {activeTab === "prompts" && (
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchPromptPreview}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4 text-amber-500" />
                <span>👁 Live Предпросмотр</span>
              </button>
              <button
                onClick={() => handleStartEditModule()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Создать слой</span>
              </button>
            </div>
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
      {/* TAB: SEMANTIC SKILL CARDS & INTEGRATIONS                             */}
      {/* ==================================================================== */}
      {activeTab === "skills" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Box className="h-4 w-4 text-amber-500" />
                <span>Навыки и интеграции Веры</span>
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Семантические карточки интеграций: специализированные промпт-правила, исполняемые функции песочницы и защищенные API-ключи.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 4 cols: Cards Selector */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
                Подключенные сервисы ({skillCards.length})
              </div>

              {skillCards.length > 0 ? (
                <div className="space-y-2.5">
                  {skillCards.map((card) => {
                    const isSelected = selectedCardSlug === card.group_slug;
                    return (
                      <div
                        key={card.group_slug}
                        onClick={() => selectCard(card)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                            {card.group_name}
                          </h4>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {card.group_slug}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {card.tools.length} инстр.
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {card.secrets.length} ключей
                          </span>
                          {card.prompt_rules && card.prompt_rules.trim() ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Правила активны
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                              Без правил
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  Карточки интеграций не найдены
                </div>
              )}

              <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 space-y-1.5">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Нужна новая интеграция?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Попросите ИИ-Архитектора в чате подключить новую CRM, склад или платежную систему — он автоматически создаст карточку, код навыка и правила диалога.
                </p>
              </div>
            </div>

            {/* Right 8 cols: Selected Card Detailed Content */}
            <div className="lg:col-span-8 space-y-6">
              {(() => {
                const currentCard = skillCards.find((c) => c.group_slug === selectedCardSlug);
                if (!currentCard) {
                  return (
                    <div className="p-12 text-center text-xs text-zinc-400 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      Выберите карточку интеграции слева для настройки
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Card Header */}
                    <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <span>{currentCard.group_name}</span>
                        </h3>
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {currentCard.group_slug}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Управление поведением Веры, расчетными алгоритмами и API-ключами данной интеграции.
                      </p>
                    </div>

                    {/* Section 1: Prompt Rules */}
                    <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-amber-500" />
                            <span>1. Промпт-правила интеграции (System Prompt Rules)</span>
                          </h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Специализированные инструкции (English/Russian), автоматически добавляемые в системный промпт Веры.
                          </p>
                        </div>
                        <button
                          onClick={handleSaveCardRules}
                          disabled={isSavingCardRules}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-40"
                        >
                          {isSavingCardRules ? "Сохранение..." : "Сохранить правила"}
                        </button>
                      </div>

                      <textarea
                        value={editingCardRules}
                        onChange={(e) => setEditingCardRules(e.target.value)}
                        rows={8}
                        placeholder="### PROTOCOL FOR THIS INTEGRATION:\n1. When user asks about availability, call match_tallora_shoes...\n2. Never invent stock..."
                        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>

                    {/* Section 2: Connected Sandbox Tools */}
                    <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 text-amber-500" />
                            <span>2. Инструменты песочницы ({currentCard.tools.length})</span>
                          </h4>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Исполняются в изолированной среде altai-sandboxd с аппаратным тайм-аутом и защитой сети.
                          </p>
                        </div>
                      </div>

                      {currentCard.tools.length > 0 ? (
                        <div className="space-y-3">
                          {currentCard.tools.map((t) => {
                            const isCodeShown = revealedToolCodes[t.id];
                            return (
                              <div
                                key={t.id}
                                className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                                        {t.name}
                                      </span>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        JavaScript
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                      {t.description || "Пользовательский инструмент"}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() =>
                                      setRevealedToolCodes((prev) => ({
                                        ...prev,
                                        [t.id]: !prev[t.id],
                                      }))
                                    }
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Code className="h-3 w-3" />
                                    <span>{isCodeShown ? "Скрыть код" : "Код функции"}</span>
                                    {isCodeShown ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                {t.parameters_schema && Object.keys(t.parameters_schema).length > 0 && (
                                  <div className="text-[11px] text-zinc-500 font-mono bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                                    Параметры: {JSON.stringify(t.parameters_schema)}
                                  </div>
                                )}

                                {isCodeShown && (
                                  <pre className="p-3.5 rounded-xl bg-zinc-950 text-amber-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800">
                                    {t.code}
                                  </pre>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                          В этой интеграции нет инструментов.
                        </div>
                      )}
                    </div>

                    {/* Section 3: Integration Secrets */}
                    <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                          <span>3. Защищенные ключи и токены ({currentCard.secrets.length})</span>
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Передаются напрямую в защищенную песочницу и никогда не раскрываются клиенту.
                        </p>
                      </div>

                      {currentCard.secrets.length > 0 ? (
                        <div className="space-y-2">
                          {currentCard.secrets.map((s) => (
                            <div
                              key={s.key_name}
                              className="p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                                  {s.key_name}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-400 ml-3">
                                  {s.is_set ? "••••••••••••••••" : "Не задан"}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteSecret(s.key_name)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Удалить ключ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                          API-ключи для этой карточки не заданы.
                        </div>
                      )}

                      {/* Add Secret Inline Form */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          Добавить ключ в эту карточку
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={cardSecretKey}
                            onChange={(e) => setCardSecretKey(e.target.value.toUpperCase())}
                            placeholder="API_KEY_NAME"
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 font-mono text-xs"
                          />
                          <input
                            type="password"
                            value={cardSecretVal}
                            onChange={(e) => setCardSecretVal(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 font-mono text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSecretToCard}
                          disabled={!cardSecretKey.trim() || !cardSecretVal.trim()}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          Сохранить ключ в карточку
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: LIVE ASSEMBLED SYSTEM PROMPT PREVIEW                          */}
      {/* ==================================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <span>Live Предпросмотр системного промпта</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  {promptPreview
                    ? `Сотрудник: ${promptPreview.employee} | Роль: ${promptPreview.role} | Строк: ${promptPreview.lines_count} | Символов: ${promptPreview.character_count}`
                    : "Сборка всех слоев и контекста тенанта..."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {promptPreview && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(promptPreview.assembled_prompt);
                      setCopiedPreview(true);
                      setTimeout(() => setCopiedPreview(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedPreview ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Скопировать</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingPreview ? (
                <div className="py-20 text-center text-xs text-zinc-400 space-y-2">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent" />
                  <p>Генерация системного промпта из базы данных...</p>
                </div>
              ) : promptPreview ? (
                <div className="space-y-4">
                  {/* Prompt Text */}
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 select-text overflow-x-auto">
                    {promptPreview.assembled_prompt}
                  </pre>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Не удалось загрузить системный промпт.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
