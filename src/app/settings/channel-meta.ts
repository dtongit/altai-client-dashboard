import type { ChannelItem, ChannelLineStatus } from "@/types";

/** Display names for known channel ids. Unknown ids fall back to the id itself. */
const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram Direct",
  instagram_comment: "Комментарии Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  telegram_business: "Telegram Business",
  max: "MAX",
  avito: "Авито",
};

export function channelLabel(id: string): string {
  return CHANNEL_LABELS[id] ?? id;
}

/** Order of the cards; anything else follows in API order. */
const CHANNEL_ORDER = ["instagram", "whatsapp", "telegram_business", "max"];

export function sortChannels(channels: ChannelItem[]): ChannelItem[] {
  const rank = (id: string) => {
    const i = CHANNEL_ORDER.indexOf(id === "instagram_comment" ? "instagram" : id);
    return i === -1 ? CHANNEL_ORDER.length : i;
  };
  return channels
    .map((c, idx) => ({ c, idx }))
    .sort((a, b) => rank(a.c.id) - rank(b.c.id) || a.idx - b.idx)
    .map((x) => x.c);
}

/** Message under the card for a line that is not active. Empty for an active line. */
export function lineStatusMessage(status: ChannelLineStatus): string | null {
  if (status === "active") return null;
  if (status === "not_connected") return "Ещё не подключён";
  if (status === "unknown") return "Не удалось проверить линию";
  return "Линия в Umnico не активна, нужна повторная авторизация";
}

/** `+<digits>` for a bare phone number, anything else as given. */
export function formatPhone(identity: string): string {
  const v = identity.trim();
  if (/^\d+$/.test(v)) return `+${v}`;
  return v;
}

export function formatIdentity(id: string, identity?: string | null): string | null {
  if (!identity) return null;
  if (id === "whatsapp") return formatPhone(identity);
  return identity;
}

export const AUTOPILOT_LOCKED_HINT = "Автопилот станет доступен после проверки качества ответов Веры";
