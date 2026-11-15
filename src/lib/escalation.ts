/** Who Vera handed a chat to, read from the raw `tools_executed` of a turn (#385).
 * The tool result has `to` (names asked for; absent = everyone) and `fallback` (set when nobody asked could be reached). */
export interface EscalationTarget {
  /** Names Vera chose; empty = everyone. */
  to: string[];
  /** The people asked could not be reached, so it went to everyone. */
  fallback: boolean;
}

export function escalationTarget(toolsExecuted: unknown): EscalationTarget | null {
  if (!Array.isArray(toolsExecuted)) return null;
  for (let i = toolsExecuted.length - 1; i >= 0; i--) {
    const t = toolsExecuted[i] as any;
    if (!t || (t.tool !== "escalate_to_manager" && t.tool !== "ask_manager")) continue;
    const out = t.output ?? t.result;
    if (!out || typeof out !== "object") continue;
    if (t.tool === "escalate_to_manager" && out.status !== "escalated") continue;
    const to = Array.isArray(out.to) ? out.to.filter((n: unknown): n is string => typeof n === "string" && n !== "") : [];
    return { to, fallback: Boolean(out.fallback) };
  }
  return null;
}

/** «Алина», «Алина, Мария» or «всем» (+ « (никого не нашли)» when fell back). */
export function escalationTargetText(t: EscalationTarget): string {
  if (t.to.length === 0) return "всем";
  const names = t.to.join(", ");
  return t.fallback ? `всем (${names} недоступны)` : names;
}
