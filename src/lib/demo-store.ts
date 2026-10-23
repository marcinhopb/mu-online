/** Estado DEMO local (localStorage). Nunca SQL real, nunca servidor. */
import { useSyncExternalStore } from "react";
import { INITIAL_ITEMS, INITIAL_LISTINGS, type DemoItem, type Listing } from "./mock-data";
import type { AuditEntry } from "./api-contracts";
import { canTransition, type ItemOptions, type TradeState } from "./game-rules";

type State = { items: DemoItem[]; listings: Listing[]; audit: AuditEntry[]; simulatedBalance: number };
const KEY = "mu-legacy-demo-v1";
const initial: State = { items: INITIAL_ITEMS, listings: INITIAL_LISTINGS, audit: [], simulatedBalance: 250 };

let state: State = initial;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...initial, ...JSON.parse(raw) }; } catch { /* ignore */ }
}
function set(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
const audit = (action: string, target: string, detail: string): AuditEntry => ({
  id: crypto.randomUUID().slice(0, 8), at: new Date().toISOString(), actor: "conta_teste_demo", action, target, detail,
});

export function useDemo() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => { load(); return state; },
    () => initial,
  );
}

export const demo = {
  saveItem(serial: string, options: ItemOptions) {
    set({
      ...state,
      items: state.items.map((i) => (i.serial === serial ? { ...i, options, origin: "editor" } : i)),
      audit: [audit("item.edit (DEMO)", serial, `+${options.level} L:${options.luck} S:${options.skill} A:${options.additional} EXC:${options.excellent.length}`), ...state.audit],
    });
  },
  advance(id: string, to: TradeState) {
    const l = state.listings.find((x) => x.id === id);
    if (!l || !canTransition(l.state, to)) return;
    set({
      ...state,
      listings: state.listings.map((x) => x.id === id ? { ...x, state: to, history: [...x.history, { state: to, at: new Date().toISOString() }] } : x),
      audit: [audit("trade.transition (DEMO)", id, `${l.state} → ${to}`), ...state.audit],
    });
  },
  list(item: DemoItem, priceBRL: number) {
    const id = `L-${Math.floor(Math.random() * 900 + 200)}`;
    set({
      ...state,
      items: state.items.map((i) => (i.serial === item.serial ? { ...i, reserved: true } : i)),
      listings: [{ id, itemName: item.name, level: item.options.level, seller: "conta_teste_demo", priceBRL, state: "listed", mine: true, history: [{ state: "listed", at: new Date().toISOString() }] }, ...state.listings],
      audit: [audit("item.reserve (DEMO)", item.serial, `anúncio ${id} R$ ${priceBRL} (simulado)`), ...state.audit],
    });
  },
  reset() { set(initial); },
};