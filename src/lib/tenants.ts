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
  logoShowroomUrl?: string;
  veraAvatarUrl?: string;
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
    displayName: "möbel&zeit",
    logoBadgeUrl: "/logos/mobel_zeit_badge.png",
    logoShowroomUrl: "/mobel_zeit_showroom.png",
    veraAvatarUrl: "/vera_showroom_avatar.png",
    logoTextUrl: "/logos/mobel_zeit_text_white.png",
    primaryColor: "#C8102E",
    primaryHover: "#9E0B23",
    primaryRing: "rgba(200, 16, 46, 0.35)",
    primaryLightBg: "rgba(200, 16, 46, 0.08)",
    watermarkText: "&",
    hasPattern: true,
    badgeText: "möbel & zeit",
    placeholderText: "Спросите о моделях, тканях, ценах или доставке…",
    suggestedQuestions: [
      "Какие есть механизмы?",
      "Сроки и доставка",
      "Где ближайший салон?",
      "Скидки в аутлете",
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
      logoShowroomUrl: custom.logoShowroomUrl,
      veraAvatarUrl: custom.veraAvatarUrl,
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
