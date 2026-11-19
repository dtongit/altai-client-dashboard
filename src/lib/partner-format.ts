// Formatting helpers for the partner portal and the partner/billing admin screens.
// Money is integer kopecks everywhere in the API; the UI shows whole roubles: «1 000 000 ₽».

const THIN = " "; // narrow no-break space between thousands
const NBSP = " ";

/** Kopecks to whole roubles (half up), grouped by narrow no-break spaces, no currency sign. */
export function rubNumber(kop: number | null | undefined): string {
  const v = Math.round((kop ?? 0) / 100);
  const sign = v < 0 ? "-" : "";
  return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
}

/** «1 000 000 ₽» */
export function formatRub(kop: number | null | undefined): string {
  return `${rubNumber(kop)}${NBSP}₽`;
}

/** Whole roubles (not kopecks) with the sign, for values already in roubles. */
export function formatRubWhole(rub: number): string {
  return formatRub(Math.round(rub) * 100);
}

/** Basis points as percent: 1250 -> «12,5%». */
export function formatBp(bp: number): string {
  const v = bp / 100;
  return `${String(Number.isInteger(v) ? v : Math.round(v * 100) / 100).replace(".", ",")}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** «10 декабря» */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** `2026-11` -> «ноябрь 2026» */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "-";
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** `2026-11` -> «ноя» */
export function shortMonth(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  return m ? MONTHS_SHORT[Number(m[2]) - 1] ?? period : period;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DEAL_TYPE_LABELS: Record<string, string> = { rep: "Рекрутер", manager: "Хедхантер" };

/** Roles a partner worked in during the last closed month (`roles` from the API), set on the close day each month. */
export const ROLE_LABELS: Record<string, string> = { recruiter: "Рекрутер", headhunter: "Хедхантер", agency: "Кадровое агентство" };

/** «Рекрутер · Кадровое агентство», or «Партнёр» before anyone paid. */
export function roleLabel(roles: readonly string[] | null | undefined): string {
  const named = (roles ?? []).map((r) => ROLE_LABELS[r]).filter(Boolean);
  return named.length ? named.join(" · ") : "Партнёр";
}
export const DEAL_TYPE_HINTS: Record<string, string> = {
  rep: "передали контакт, продаём мы",
  manager: "показали Веру и договорились о тарифе",
};
export const LEGAL_STATUS_LABELS: Record<string, string> = { npd: "Самозанятый", ip: "ИП", ooo: "ООО" };
export const CLIENT_STATUS_LABELS: Record<string, string> = {
  lead: "Лид",
  demo: "Демо",
  launch_paid: "Запуск оплачен",
  paying: "Платит",
  paused: "Пауза",
  churned: "Ушёл",
};
export const PAYMENT_KIND_LABELS: Record<string, string> = {
  launch: "Запуск",
  subscription: "Подписка",
  pack: "Пакет сообщений",
};
export const PAYOUT_STATUS_LABELS: Record<string, string> = { due: "К выплате", paid: "Выплачено", carried: "Перенесено" };
export const INVOICE_STATUS_LABELS: Record<string, string> = { issued: "Выставлен", paid: "Оплачен", cancelled: "Отменён" };
export const PARTNER_STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  approved: "Активен",
  blocked: "Заблокирован",
};
