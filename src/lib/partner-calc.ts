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
