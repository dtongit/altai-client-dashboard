export const TENANT_DISPLAY_NAMES: Record<string, string> = {
  haier: "Haier",
  lada_digit: "LADA Цифра",
  mediasafe: "MediaSafe",
  kostis: "КОСТИС",
  tallora: "Tallora",
  client_tallora: "Tallora",
  foxford: "Фоксфорд",
  gk_fsk: "ГК ФСК",
  neometria: "Неометрия",
  mobel_zeit: "möbel&zeit gallery",
  medicinskiy_tsentr_nauka: "Медицинский центр «Наука»",
  "demo-meditsinskiy-tsentr-nauka": "Медицинский центр «Наука»",
  altai_optima: "ALTAI Optima",
  newo_ai: "NEWO AI",
  demo_amo: "amoCRM",
  demo_b24: "Битрикс24",
};

export interface TenantBrandConfig {
  displayName: string;
  logoBadgeUrl?: string;
  logoTextUrl?: string;
  primaryColor: string;
  primaryHover: string;
  primaryRing: string;
  primaryLightBg: string;
  watermarkText?: string;
  hasPattern: boolean;
  badgeText?: string;
  placeholderText?: string;
  suggestedQuestions?: string[];
}

export const TENANT_BRAND_CONFIGS: Record<string, Partial<TenantBrandConfig>> = {
  mobel_zeit: {
    displayName: "möbel&zeit gallery",
    logoBadgeUrl: "/logos/mobel_zeit_badge.png",
    logoTextUrl: "/logos/mobel_zeit_text_white.png",
    primaryColor: "#cc0000",
    primaryHover: "#b30000",
    primaryRing: "rgba(204, 0, 0, 0.35)",
    primaryLightBg: "rgba(204, 0, 0, 0.08)",
    watermarkText: "möbel & zeit",
    hasPattern: true,
    badgeText: "möbel & zeit",
    placeholderText: "Спросите о коллекциях, ценах со скидкой или дизайн-проекте...",
    suggestedQuestions: [
      "Какие флагманские коллекции диванов представлены?",
      "Какие модели со скидкой до 70% есть в аутлете?",
      "Как заказать бесплатный 3D дизайн-проект?",
      "В чем уникальность патентов и стандарта DGM?",
    ],
  },
};

export function getTenantDisplayName(
  tenantId: string,
  remoteBusinessName?: string
): string {
  if (TENANT_DISPLAY_NAMES[tenantId]) {
    return TENANT_DISPLAY_NAMES[tenantId];
  }
  if (
    remoteBusinessName &&
    remoteBusinessName !== "Загрузка..." &&
    !remoteBusinessName.includes("Демо Стенд")
  ) {
    return remoteBusinessName.replace(/^ООО\s*[«"']?(.*?)[»"']?$/, "$1");
  }
  return tenantId
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getTenantBrand(
  tenantId: string,
  remoteBusinessName?: string
): TenantBrandConfig {
  const custom = TENANT_BRAND_CONFIGS[tenantId];
  const displayName = getTenantDisplayName(tenantId, remoteBusinessName);

  if (custom && custom.primaryColor) {
    return {
      displayName: custom.displayName || displayName,
      logoBadgeUrl: custom.logoBadgeUrl,
      logoTextUrl: custom.logoTextUrl,
      primaryColor: custom.primaryColor,
      primaryHover: custom.primaryHover || "#b30000",
      primaryRing: custom.primaryRing || "rgba(204, 0, 0, 0.35)",
      primaryLightBg: custom.primaryLightBg || "rgba(204, 0, 0, 0.08)",
      watermarkText: custom.watermarkText,
      hasPattern: Boolean(custom.hasPattern),
      badgeText: custom.badgeText,
      placeholderText: custom.placeholderText || "Задайте любой вопрос по продукции, ценам или услугам...",
      suggestedQuestions: custom.suggestedQuestions,
    };
  }

  return {
    displayName,
    primaryColor: "#f59e0b",
    primaryHover: "#d97706",
    primaryRing: "rgba(245, 158, 11, 0.3)",
    primaryLightBg: "rgba(245, 158, 11, 0.1)",
    hasPattern: false,
    placeholderText: "Задайте любой вопрос по продукции, ценам или услугам...",
  };
}
