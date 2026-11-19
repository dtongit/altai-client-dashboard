import { PartnerDealType, SplitRates } from "@/types";

export interface GoalCalcInput {
  splitRates: SplitRates;
  dealType: PartnerDealType;
  /** Approved agencies above the partner (0..2), from `/partner/forecast`; falls back to has-inviter = 1. */
  depth?: number;
  hasInviter: boolean;
  monthlyPriceKop: number;
  goalKop: number;
  /** Clients of the first / second row of partners below the user (their income is shown in the team part). */
  layer1Clients: number;
  layer2Clients: number;
  /** Paying clients the partner already has. */
  payingClients: number;
  newPerMonth: number;
}

export interface GoalCalcResult {
  depth: 0 | 1 | 2;
  sellerBp: number;
  perClientKop: number;
  teamKop: number;
  neededClients: number;
  remainingClients: number;
  /** null when no new clients are planned per month. */
  months: number | null;
}

const share = (rows: number[][] | undefined, depth: number, idx: number) => rows?.[depth]?.[idx] ?? 0;

/**
 * Goal calculator (design/partners.md, «Моя цель»), monthly split only:
 * own income per client = monthly price x seller share at the partner's depth;
 * team = layer-1 clients x price x A1 share at depth 1 + layer-2 clients x price x A2 share at depth 2;
 * needed = ceil(max(0, goal - team) / per client); remaining = needed - clients already paying.
 * Depth comes from the API (`depth` on `/partner/forecast` and `/partner/me`); older responses without it fall
 * back to 1 with an inviter, 0 without.
 */
export function calcGoal(i: GoalCalcInput): GoalCalcResult {
  const monthly = i.splitRates?.[i.dealType]?.monthly;
  const d = typeof i.depth === "number" ? i.depth : i.hasInviter ? 1 : 0;
  const depth = Math.max(0, Math.min(2, Math.round(d))) as 0 | 1 | 2;
  const sellerBp = share(monthly, depth, 0);
  const perClientKop = Math.round((i.monthlyPriceKop * sellerBp) / 10000);
  const teamKop =
    Math.round((i.layer1Clients * i.monthlyPriceKop * share(monthly, 1, 1)) / 10000) +
    Math.round((i.layer2Clients * i.monthlyPriceKop * share(monthly, 2, 2)) / 10000);
  const neededClients = perClientKop > 0 ? Math.ceil(Math.max(0, i.goalKop - teamKop) / perClientKop) : 0;
  const remainingClients = Math.max(0, neededClients - i.payingClients);
  const months = i.newPerMonth > 0 ? Math.ceil(remainingClients / i.newPerMonth) : null;
  return { depth, sellerBp, perClientKop, teamKop, neededClients, remainingClients, months };
}

// ---------- «Невидимый капитал»: the goal compared with a bank deposit (David's mock-up «Моя цель», 2026-11-19) ----------

/** Deposit assumptions; refresh once a month. */
export const DEPOSIT = {
  /** Average maximum rate of the top-10 banks, Bank of Russia, 1st ten days of November 2026. */
  rate: 0.1331,
  rateDate: "ноябрь 2026",
  /** Interest free of personal income tax per year: 1 mln ₽ x the year's maximum key rate (to be confirmed). */
  taxFreeRub: 160_000,
};

/** Roubles one would have to keep in a bank to receive `netMonthRub` a month after НДФЛ (13%, 15% above 2.4 mln a year). */
export function depositForRub(netMonthRub: number): number {
  const net = Math.max(0, netMonthRub) * 12;
  let gross = (net - 0.13 * DEPOSIT.taxFreeRub) / 0.87;
  if (gross > 2_400_000) {
    const netAt = 2_400_000 - 0.13 * (2_400_000 - DEPOSIT.taxFreeRub);
    gross = 2_400_000 + (net - netAt) / 0.85;
  }
  gross = Math.max(gross, net); // all of it within the tax-free amount
  return gross / DEPOSIT.rate;
}

/** Monthly income for months 0..horizon: today's income plus `newPerMonth` clients a month, capped at the goal. */
export function incomeProjection(nowKop: number, perClientKop: number, newPerMonth: number, goalKop: number, horizon: number): number[] {
  const cap = goalKop > 0 ? Math.max(goalKop, nowKop) : Number.POSITIVE_INFINITY;
  return Array.from({ length: horizon + 1 }, (_, m) => Math.min(cap, nowKop + m * Math.max(0, newPerMonth) * perClientKop));
}

/** «клиент» / «клиента» / «клиентов» */
export function pluralClients(n: number): string {
  const a = n % 10;
  const b = n % 100;
  if (a === 1 && b !== 11) return "клиент";
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "клиента";
  return "клиентов";
}
