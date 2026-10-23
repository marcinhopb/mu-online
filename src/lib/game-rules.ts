/**
 * MU Legacy Arena — regras de domínio (PROTÓTIPO / DEMO).
 *
 * Nada aqui toca um GameServer real. Estas regras espelham o que o servidor
 * DEVERÁ aplicar no futuro (enforcement server-side). O cliente apenas
 * pré-valida para UX — nunca é fonte de verdade.
 */

export type CharClass = "BK" | "SM" | "ME" | "MG" | "DL";
export const CLASSES: { id: CharClass; name: string }[] = [
  { id: "BK", name: "Blade Knight" },
  { id: "SM", name: "Soul Master" },
  { id: "ME", name: "Muse Elf" },
  { id: "MG", name: "Magic Gladiator" },
  { id: "DL", name: "Dark Lord" },
];

/** DL é obrigatório no elenco e possui o atributo exclusivo Command. */
export const CLASS_HAS_COMMAND: Record<CharClass, boolean> = {
  BK: false, SM: false, ME: false, MG: false, DL: true,
};

export type SlotType =
  | "helm" | "armor" | "pants" | "gloves" | "boots"
  | "weapon" | "shield" | "wings" | "ring" | "pendant";

export const SLOT_LABEL: Record<SlotType, string> = {
  helm: "Elmo", armor: "Armadura", pants: "Calça", gloves: "Luvas", boots: "Botas",
  weapon: "Arma", shield: "Escudo", wings: "Asa", ring: "Anel", pendant: "Pendant",
};

/** Limite do editor do jogador. Enforcement definitivo será server-side. */
export const MAX_EDITOR_LEVEL = 11;
export const MAX_LEVEL = 15;
/** +12..+15: exclusivos de eventos oficiais ou Donate. */
export const isPremiumLevel = (lvl: number) => lvl >= 12 && lvl <= MAX_LEVEL;
/** Aparência transparente apenas +12..+15 (renderização futura no cliente de jogo). */
export const hasTransparentAppearance = (lvl: number) => isPremiumLevel(lvl);

/**
 * Força relativa do MESMO item. Metas configuráveis de TESTE, não balanceamento comprovado.
 * Base +11 = 100.
 */
export const POWER_TARGETS: Record<number, number> = {
  11: 100, 12: 102, 13: 105, 14: 108, 15: 111,
};
export function relativePower(level: number, targets = POWER_TARGETS): number {
  if (level >= 11) return targets[level] ?? 100;
  // abaixo de +11: curva linear de teste (0 → 60, 11 → 100)
  return Math.round(60 + (40 * level) / 11);
}

export type OptionWhitelist = {
  luck: boolean; skill: boolean; additional: boolean; excellent: string[];
};

const EXC_ARMOR = ["Aumenta HP máx. +4%", "Aumenta Mana máx. +4%", "Reduz dano 4%", "Reflete dano 5%", "Taxa de defesa +10%", "Zen ao matar +40%"];
const EXC_WEAPON = ["Dano excelente", "Dano +nível/20", "Dano +2%", "Velocidade de ataque +7", "Vida ao matar", "Mana ao matar"];

export const WHITELIST: Record<SlotType, OptionWhitelist> = {
  helm: { luck: true, skill: false, additional: true, excellent: EXC_ARMOR },
  armor: { luck: true, skill: false, additional: true, excellent: EXC_ARMOR },
  pants: { luck: true, skill: false, additional: true, excellent: EXC_ARMOR },
  gloves: { luck: true, skill: false, additional: true, excellent: EXC_ARMOR },
  boots: { luck: true, skill: false, additional: true, excellent: EXC_ARMOR },
  shield: { luck: true, skill: true, additional: true, excellent: EXC_ARMOR },
  weapon: { luck: true, skill: true, additional: true, excellent: EXC_WEAPON },
  wings: { luck: true, skill: false, additional: true, excellent: [] },
  ring: { luck: false, skill: false, additional: true, excellent: EXC_ARMOR.slice(0, 4) },
  pendant: { luck: false, skill: false, additional: true, excellent: EXC_WEAPON.slice(0, 4) },
};

export type ItemOptions = {
  level: number; luck: boolean; skill: boolean; additional: number; excellent: string[];
};

/** Pré-validação de edição pelo jogador (espelho da regra server-side futura). */
export function validateEdit(slot: SlotType, opts: ItemOptions): string[] {
  const w = WHITELIST[slot];
  const errs: string[] = [];
  if (opts.level < 0 || opts.level > MAX_EDITOR_LEVEL)
    errs.push(`Nível +${opts.level} bloqueado: o editor permite apenas +0 a +${MAX_EDITOR_LEVEL}.`);
  if (opts.luck && !w.luck) errs.push("Luck não permitido para este tipo.");
  if (opts.skill && !w.skill) errs.push("Skill não permitido para este tipo.");
  if (opts.additional && !w.additional) errs.push("Additional não permitido para este tipo.");
  if (opts.additional < 0 || opts.additional > 16 || opts.additional % 4 !== 0)
    errs.push("Additional deve ser 0, 4, 8, 12 ou 16.");
  const bad = opts.excellent.filter((e) => !w.excellent.includes(e));
  if (bad.length) errs.push("Opção Excellent fora da whitelist deste tipo.");
  return errs;
}

export const COLLECTIONS = ["Crimson", "Obsidian", "Celestial", "Sovereign", "Phantom"] as const;
export const SET_PARTS: SlotType[] = ["helm", "armor", "pants", "gloves", "boots"];

/** Semana ISO-like simples (índice desde epoch) para rodízio determinístico. */
export const weekIndex = (d: Date) => Math.floor((d.getTime() / 86400000 + 3) / 7);
export const collectionForWeek = (w: number) => COLLECTIONS[((w % 5) + 5) % 5]!;

/** Sorteio determinístico (seed = semana) de 2 partes DISTINTAS do mesmo set. */
export function weeklyChampionParts(w: number): [SlotType, SlotType] {
  const a = (w * 7 + 3) % 5;
  let b = (w * 11 + 1) % 5;
  if (b === a) b = (b + 1) % 5;
  return [SET_PARTS[a]!, SET_PARTS[b]!];
}
export const weeklyEventPart = (w: number): SlotType => SET_PARTS[(w * 13 + 2) % 5]!;

/** Máquina de estados do escrow TradePay (DEMO). */
export type TradeState =
  | "listed" | "reserved" | "awaiting_payment" | "paid" | "pending_delivery"
  | "delivered" | "settled" | "cancelled" | "refunded";

export const TRADE_TRANSITIONS: Record<TradeState, TradeState[]> = {
  listed: ["reserved", "cancelled"],
  reserved: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["pending_delivery", "refunded"],
  pending_delivery: ["delivered", "refunded"],
  delivered: ["settled", "refunded"],
  settled: [],
  cancelled: [],
  refunded: [],
};
export const canTransition = (from: TradeState, to: TradeState) => TRADE_TRANSITIONS[from].includes(to);

export const TRADE_LABEL: Record<TradeState, string> = {
  listed: "Anunciado", reserved: "Reservado", awaiting_payment: "Aguardando pagamento (simulado)",
  paid: "Pago (simulado)", pending_delivery: "Entrega pendente", delivered: "Entregue",
  settled: "Liquidado", cancelled: "Cancelado", refunded: "Reembolsado",
};