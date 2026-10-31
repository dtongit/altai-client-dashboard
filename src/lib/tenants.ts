export const TENANT_DISPLAY_NAMES: Record<string, string> = {
  haier: "Haier",
  lada_digit: "LADA Цифра",
  mediasafe: "MediaSafe",
  kostis: "КОСТИС",
  tallora: "Tallora",
  foxford: "Фоксфорд",
  gk_fsk: "ГК ФСК",
  neometria: "Неометрия",
  mobel_zeit: "möbel&zeit gallery",
  lagoon_resort: "Lagoon Resort",
  medicinskiy_tsentr_nauka: "Медицинский центр «Наука»",
  "demo-meditsinskiy-tsentr-nauka": "Медицинский центр «Наука»",
  altai_optima: "ALTAI Optima",
  newo_ai: "NEWO AI",
  demo_amo: "amoCRM",
  demo_b24: "Битрикс24",
  ak: "A&K",
  ak_relocation: "A&K",
  adiam: "ADIAM",
};

export interface TenantBrandIntegrationItem {
  title: string;
  description: string;
}

export interface TenantBrandConfig {
  displayName: string;
  logoBadgeUrl?: string;
  logoShowroomUrl?: string;
  veraAvatarUrl?: string;
  veraPhotoUrl?: string;
  logoTextUrl?: string;
  logoWatermarkUrl?: string;
  primaryColor: string;
  primaryHover: string;
  primaryRing: string;
  primaryLightBg: string;
  watermarkText?: string;
  hasPattern: boolean;
  badgeText?: string;
  placeholderText?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  heroDescription?: string;
  whiteBackground?: boolean;
  integrationsList?: TenantBrandIntegrationItem[];
}

export const TENANT_BRAND_CONFIGS: Record<string, Partial<TenantBrandConfig>> = {
  mobel_zeit: {
    displayName: "möbel&zeit",
    logoBadgeUrl: "/logos/mobel_zeit_badge.png",
    logoShowroomUrl: "/mobel_zeit_showroom.png",
    veraAvatarUrl: "/mobel_zeit_vera_avatar.jpg",
    veraPhotoUrl: "/mobel_zeit_vera_showroom.jpg",
    logoTextUrl: "/logos/mobel_zeit_text_white.png",
    logoWatermarkUrl: "/logos/mobel_zeit_text_red.png",
    primaryColor: "#C8102E",
    primaryHover: "#9E0B23",
    primaryRing: "rgba(200, 16, 46, 0.35)",
    primaryLightBg: "rgba(200, 16, 46, 0.08)",
    watermarkText: "&",
    hasPattern: true,
    badgeText: "möbel & zeit",
    placeholderText: "Спросите о моделях, тканях, ценах или доставке…",
    welcomeMessage: "",
    suggestedQuestions: [],
  },
  lagoon_resort: {
    displayName: "Lagoon Resort",
    logoBadgeUrl: "/logos/lagoon_resort_logo.svg",
    logoShowroomUrl: "/logos/lagoon_resort_logo.svg",
    veraAvatarUrl: "/lagoon_resort_vera_avatar.jpg?v=3",
    veraPhotoUrl: "/lagoon_resort_vera_desk.jpg",
    logoTextUrl: "/logos/lagoon_resort_logo_white.svg",
    logoWatermarkUrl: "/logos/lagoon_resort_logo.svg",
    primaryColor: "#0A5C80",
    primaryHover: "#084763",
    primaryRing: "rgba(10, 92, 128, 0.35)",
    primaryLightBg: "rgba(10, 92, 128, 0.08)",
    watermarkText: "LAGOON",
    hasPattern: true,
    badgeText: "Lagoon Resort",
    placeholderText: "Спросите о резиденциях, ценах, рассрочке или ВНЖ…",
    welcomeMessage: "",
    suggestedQuestions: [],
  },
  neometria: {
    displayName: "Неометрия",
    logoBadgeUrl: "/logos/neometria_logo.png",
    logoShowroomUrl: "/logos/neometria_logo.png",
    veraAvatarUrl: "/neometria_vera_avatar.jpg",
    veraPhotoUrl: "/neometria_vera_showroom.jpg",
    logoTextUrl: "/logos/neometria_logo.png",
    logoWatermarkUrl: "/logos/neometria_logo.png",
    primaryColor: "#E07000",
    primaryHover: "#C45E00",
    primaryRing: "rgba(224, 112, 0, 0.35)",
    primaryLightBg: "rgba(224, 112, 0, 0.08)",
    watermarkText: "НЕОМЕТРИЯ",
    hasPattern: true,
    badgeText: "Неометрия",
    placeholderText: "Спросите о жилых комплексах, ценах, планировках или ипотеке…",
    welcomeMessage: "",
    suggestedQuestions: [],
    heroDescription:
      "Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю обаяние чуткого эксперта, острый ум и железную цифровую дисциплину. Держу в памяти историю каждого клиента, общаюсь по стандартам флагманского офиса продаж и уверенно довожу диалоги до реальных сделок в CRM.",
  },
  haier: {
    displayName: "Haier",
    logoBadgeUrl: "/logos/haier_logo.png",
    logoShowroomUrl: "/logos/haier_logo.png",
    veraAvatarUrl: "/haier_vera_avatar.jpg",
    veraPhotoUrl: "/haier_vera_showroom.jpg",
    logoTextUrl: "/logos/haier_logo.png",
    logoWatermarkUrl: "/logos/haier_logo.png",
    primaryColor: "#005AAB",
    primaryHover: "#00478A",
    primaryRing: "rgba(0, 90, 171, 0.35)",
    primaryLightBg: "rgba(0, 90, 171, 0.08)",
    watermarkText: "HAIER",
    hasPattern: true,
    badgeText: "Haier",
    placeholderText: "Спросите о бытовой технике, характеристиках, ценах или доставке…",
    welcomeMessage: "",
    suggestedQuestions: [],
    heroDescription:
      "Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю обаяние чуткого эксперта, острый ум и железную цифровую дисциплину. Держу в памяти историю каждого клиента, общаюсь по стандартам флагманского салона и уверенно довожу диалоги до реальных сделок в CRM.",
  },
  ak_relocation: {
    displayName: "A&K",
    logoBadgeUrl: "/logos/ak_logo.png",
    logoShowroomUrl: "/logos/ak_logo.png",
    veraAvatarUrl: "/ak_vera_avatar.jpg",
    veraPhotoUrl: "/ak_vera_showroom.jpg",
    logoTextUrl: "/logos/ak_logo.png",
    logoWatermarkUrl: "/logos/ak_logo.png",
    primaryColor: "#0E3275",
    primaryHover: "#0A2454",
    primaryRing: "rgba(14, 50, 117, 0.35)",
    primaryLightBg: "rgba(14, 50, 117, 0.08)",
    watermarkText: "A&K",
    hasPattern: true,
    badgeText: "A&K",
    whiteBackground: true,
    placeholderText: "Спросите о лотерее Green Card, шансах, требованиях или стоимости…",
    welcomeMessage: "",
    suggestedQuestions: [
      "Сколько стоит подача заявки на Green Card под ключ и что входит в $35?",
      "В какие сроки будет проходить регистрация и когда откроется прием заявок?",
      "Нужен ли загранпаспорт для участия в лотерее Green Card?",
      "Какие требования к образованию и фото предъявляет Госдепартамент США?",
    ],
    heroDescription:
      "Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю обаяние чуткого эксперта, глубокую визовую компетенцию и железную цифровую дисциплину. Держу в памяти регламенты Госдепартамента США, мгновенно передаю нестандартные вопросы персональному менеджеру A&K и уверенно перевожу интерес в готовые заявки.",
    integrationsList: [
      {
        title: "Я на связи везде:",
        description: "встречаю клиентов в WhatsApp, Telegram, MAX, на Авито, в VK и на сайте.",
      },
      {
        title: "Я сама веду CRM:",
        description: "мгновенно фиксирую контакты, историю общения и готовые заявки в Битрикс24, amoCRM или любой другой системе.",
      },
      {
        title: "Я передаю сложные вопросы человеку:",
        description: "если клиенту требуется индивидуальный разбор или он уже оплатил услугу — мгновенно эскалирую диалог персональному менеджеру.",
      },
    ],
  },
  ak: {
    displayName: "A&K",
    logoBadgeUrl: "/logos/ak_logo.png",
    logoShowroomUrl: "/logos/ak_logo.png",
    veraAvatarUrl: "/ak_vera_avatar.jpg",
    veraPhotoUrl: "/ak_vera_showroom.jpg",
    logoTextUrl: "/logos/ak_logo.png",
    logoWatermarkUrl: "/logos/ak_logo.png",
    primaryColor: "#0E3275",
    primaryHover: "#0A2454",
    primaryRing: "rgba(14, 50, 117, 0.35)",
    primaryLightBg: "rgba(14, 50, 117, 0.08)",
    watermarkText: "A&K",
    hasPattern: true,
    badgeText: "A&K",
    whiteBackground: true,
    placeholderText: "Спросите о лотерее Green Card, шансах, требованиях или стоимости…",
    welcomeMessage: "",
    suggestedQuestions: [
      "Сколько стоит подача заявки на Green Card под ключ и что входит в $35?",
      "В какие сроки будет проходить регистрация и когда откроется прием заявок?",
      "Нужен ли загранпаспорт для участия в лотерее Green Card?",
      "Какие требования к образованию и фото предъявляет Госдепартамент США?",
    ],
    heroDescription:
      "Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю обаяние чуткого эксперта, глубокую визовую компетенцию и железную цифровую дисциплину. Держу в памяти регламенты Госдепартамента США, мгновенно передаю нестандартные вопросы персональному менеджеру A&K и уверенно перевожу интерес в готовые заявки.",
    integrationsList: [
      {
        title: "Я на связи везде:",
        description: "встречаю клиентов в WhatsApp, Telegram, MAX, на Авито, в VK и на сайте.",
      },
      {
        title: "Я сама веду CRM:",
        description: "мгновенно фиксирую контакты, историю общения и готовые заявки в Битрикс24, amoCRM или любой другой системе.",
      },
      {
        title: "Я передаю сложные вопросы человеку:",
        description: "если клиенту требуется индивидуальный разбор или он уже оплатил услугу — мгновенно эскалирую диалог персональному менеджеру.",
      },
    ],
  },
  adiam: {
    displayName: "ADIAM",
    logoBadgeUrl: "/logos/adiam_logo.png",
    logoShowroomUrl: "/logos/adiam_logo.png",
    veraAvatarUrl: "/adiam_vera_avatar.jpg",
    veraPhotoUrl: "/adiam_vera_showroom.jpg",
    logoTextUrl: "/logos/adiam_logo.png",
    logoWatermarkUrl: "/logos/adiam_logo.png",
    primaryColor: "#1F62F2",
    primaryHover: "#154BC2",
    primaryRing: "rgba(31, 98, 242, 0.35)",
    primaryLightBg: "rgba(31, 98, 242, 0.08)",
    watermarkText: "ADIAM",
    hasPattern: true,
    badgeText: "ADIAM",
    whiteBackground: true,
    placeholderText: "Спросите о Programmatic-рекламе, форматах, инвентаре или тарифах…",
    welcomeMessage: "",
    suggestedQuestions: [
      "Какие рекламные форматы доступны на платформе ADIAM?",
      "Как настроить таргетинг по поведению и интересам аудитории?",
      "Какой минимальный бюджет нужен для старта тестовой кампании?",
      "Как записаться на 15-минутное онлайн-демо платформы?",
    ],
    heroDescription:
      "Я уже изучила ваш бизнес и готова стать вашим лучшим сотрудником. Объединяю экспертизу в AdTech, глубокое знание Programmatic-экосистемы и цифровую дисциплину. Квалифицирую медиапланы, подбираю форматы и уверенно довожу рекламодателей до записи на демо платформы.",
    integrationsList: [
      {
        title: "Я на связи везде:",
        description: "встречаю клиентов в WhatsApp, Telegram, MAX, на Авито, в VK и на сайте.",
      },
      {
        title: "Я знаю ваш инвентарь до мелочей:",
        description: "интегрируюсь с DSP/SSP, CRM и базами данных — моментально подбираю форматы, аудиторные сегменты и рассчитываю CPM/CPC.",
      },
      {
        title: "Я сама веду CRM:",
        description: "мгновенно фиксирую контакты, брифы и готовые лиды в Битрикс24, amoCRM или любой другой системе.",
      },
      {
        title: "Я передаю сложные запросы человеку:",
        description: "если клиенту требуется индивидуальный OpenRTB/Prebid сетап или он уже действующий рекламодатель — передаю диалог персональному аккаунту.",
      },
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
      veraPhotoUrl: custom.veraPhotoUrl,
      logoTextUrl: custom.logoTextUrl,
      primaryColor: custom.primaryColor,
      primaryHover: custom.primaryHover || "#b30000",
      primaryRing: custom.primaryRing || "rgba(204, 0, 0, 0.35)",
      primaryLightBg: custom.primaryLightBg || "rgba(204, 0, 0, 0.08)",
      watermarkText: custom.watermarkText,
      hasPattern: Boolean(custom.hasPattern),
      badgeText: custom.badgeText,
      placeholderText: custom.placeholderText || "Задайте любой вопрос по продукции, ценам или услугам...",
      welcomeMessage: custom.welcomeMessage,
      suggestedQuestions: custom.suggestedQuestions,
      heroDescription: custom.heroDescription,
      whiteBackground: custom.whiteBackground,
      integrationsList: custom.integrationsList,
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
