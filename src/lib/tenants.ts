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
