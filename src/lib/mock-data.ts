import type { CharClass, ItemOptions, SlotType, TradeState } from "./game-rules";

export type DemoItem = {
  serial: string; name: string; slot: SlotType; collection?: string; options: ItemOptions;
  origin: "drop" | "editor" | "event" | "donate"; equipped?: boolean; reserved?: boolean;
};

export type Character = {
  id: string; name: string; cls: CharClass; level: number; resets: number;
  str: number; agi: number; vit: number; ene: number; cmd?: number; guild: string;
};

const o = (level: number, luck = false, skill = false, additional = 0, excellent: string[] = []): ItemOptions =>
  ({ level, luck, skill, additional, excellent });

export const TEST_ACCOUNT = { login: "conta_teste_demo", email: "demo@exemplo.invalid", vip: "Nenhum (demo)" };

export const CHARACTERS: Character[] = [
  { id: "c1", name: "Aldric", cls: "BK", level: 400, resets: 12, str: 2800, agi: 900, vit: 1500, ene: 300, guild: "Lumen" },
  { id: "c2", name: "Seravyn", cls: "SM", level: 380, resets: 10, str: 250, agi: 700, vit: 900, ene: 3200, guild: "Lumen" },
  { id: "c3", name: "Lyrael", cls: "ME", level: 360, resets: 9, str: 400, agi: 2600, vit: 900, ene: 800, guild: "Lumen" },
  { id: "c4", name: "Korvan", cls: "MG", level: 390, resets: 11, str: 2100, agi: 800, vit: 900, ene: 1500, guild: "Lumen" },
  { id: "c5", name: "Varethos", cls: "DL", level: 395, resets: 11, str: 1900, agi: 700, vit: 900, ene: 600, cmd: 1800, guild: "Lumen" },
];

export const INITIAL_ITEMS: DemoItem[] = [
  { serial: "DEMO-0001", name: "Elmo Crimson", slot: "helm", collection: "Crimson", options: o(11, true, false, 16, ["Aumenta HP máx. +4%", "Reduz dano 4%"]), origin: "editor", equipped: true },
  { serial: "DEMO-0002", name: "Armadura Crimson", slot: "armor", collection: "Crimson", options: o(11, true, false, 16, ["Reduz dano 4%"]), origin: "editor", equipped: true },
  { serial: "DEMO-0003", name: "Calça Crimson", slot: "pants", collection: "Crimson", options: o(13, true, false, 16, ["Reflete dano 5%"]), origin: "event", equipped: true },
  { serial: "DEMO-0004", name: "Luvas Crimson", slot: "gloves", collection: "Crimson", options: o(9, false, false, 8), origin: "drop", equipped: true },
  { serial: "DEMO-0005", name: "Botas Crimson", slot: "boots", collection: "Crimson", options: o(11, true, false, 12, ["Taxa de defesa +10%"]), origin: "editor", equipped: true },
  { serial: "DEMO-0006", name: "Lâmina do Crepúsculo", slot: "weapon", options: o(11, true, true, 16, ["Dano excelente", "Dano +2%"]), origin: "editor", equipped: true },
  { serial: "DEMO-0007", name: "Escudo Bastião", slot: "shield", options: o(7, false, true, 4), origin: "drop", equipped: true },
  { serial: "DEMO-0008", name: "Asas do Ocaso", slot: "wings", options: o(11, true, false, 12), origin: "editor", equipped: true },
  { serial: "DEMO-0009", name: "Anel de Âmbar", slot: "ring", options: o(4, false, false, 4), origin: "drop", equipped: true },
  { serial: "DEMO-0010", name: "Anel Vespertino", slot: "ring", options: o(4, false, false, 0), origin: "drop", equipped: true },
  { serial: "DEMO-0011", name: "Pendant Astral", slot: "pendant", options: o(6, false, false, 8, ["Dano excelente"]), origin: "drop", equipped: true },
  { serial: "DEMO-0012", name: "Elmo Obsidian", slot: "helm", collection: "Obsidian", options: o(5), origin: "drop" },
  { serial: "DEMO-0013", name: "Espada Rúnica", slot: "weapon", options: o(3, false, true), origin: "drop" },
  { serial: "DEMO-0014", name: "Botas Phantom", slot: "boots", collection: "Phantom", options: o(8, true), origin: "drop" },
  { serial: "DEMO-0015", name: "Luvas Celestial", slot: "gloves", collection: "Celestial", options: o(15, true, false, 16, ["Aumenta HP máx. +4%"]), origin: "donate" },
];

export type RankRow = { pos: number; name: string; cls: CharClass; guild: string; kills: number; deaths: number; points: number };
const NAMES = ["Thalor", "Nyxara", "Brennic", "Ysolde", "Kaelith", "Morvane", "Draven", "Elowen", "Garrik", "Sylfaen", "Orin", "Vaela", "Tormund", "Iskra", "Rhovan", "Zeyra"];
const CLS: CharClass[] = ["BK", "SM", "ME", "MG", "DL"];
const GUILDS = ["Lumen", "Umbra", "Aurora", "Ferro", "Vigília"];

export function mockRanking(period: "diario" | "semanal" | "mensal"): RankRow[] {
  const mult = period === "diario" ? 1 : period === "semanal" ? 6 : 24;
  const seed = period.length;
  return NAMES.map((name, i) => {
    const kills = Math.round((180 - i * 9 + ((i * seed * 7) % 13)) * mult);
    const deaths = Math.round((40 + ((i * 5 + seed) % 30)) * mult);
    return { pos: 0, name, cls: CLS[(i + seed) % 5]!, guild: GUILDS[i % 5]!, kills, deaths, points: kills * 3 - deaths };
  }).sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, pos: i + 1 }));
}

export const RANK_HISTORY = [
  { period: "Semana 41/2026", winner: "Nyxara", cls: "SM" as CharClass, prize: "Elmo + Botas Sovereign +13" },
  { period: "Semana 40/2026", winner: "Thalor", cls: "BK" as CharClass, prize: "Armadura + Luvas Celestial +13" },
  { period: "Setembro/2026", winner: "Kaelith", cls: "DL" as CharClass, prize: "Cetro DL +15" },
  { period: "Semana 39/2026", winner: "Ysolde", cls: "ME" as CharClass, prize: "Calça + Elmo Obsidian +13" },
];

export type Listing = {
  id: string; itemName: string; level: number; seller: string; priceBRL: number; state: TradeState;
  mine?: boolean; history: { state: TradeState; at: string }[];
};
const now = "2026-10-23T12:00:00Z";
export const INITIAL_LISTINGS: Listing[] = [
  { id: "L-101", itemName: "Armadura Phantom", level: 11, seller: "Garrik", priceBRL: 45, state: "listed", history: [{ state: "listed", at: now }] },
  { id: "L-102", itemName: "Asas do Abismo", level: 9, seller: "Elowen", priceBRL: 80, state: "listed", history: [{ state: "listed", at: now }] },
  { id: "L-103", itemName: "Arco Celestial", level: 11, seller: "Vaela", priceBRL: 60, state: "listed", history: [{ state: "listed", at: now }] },
  { id: "L-104", itemName: "Elmo Sovereign", level: 10, seller: "Orin", priceBRL: 25, state: "listed", history: [{ state: "listed", at: now }] },
  { id: "L-105", itemName: "Pendant Rubro", level: 7, seller: "Iskra", priceBRL: 18, state: "listed", history: [{ state: "listed", at: now }] },
];

export const NEWS = [
  { tag: "Protótipo", title: "Portal de demonstração no ar", date: "23 out 2026", body: "Explore o painel, o editor de itens e o mercado — tudo em modo simulado." },
  { tag: "PvP", title: "Temporada de rankings em teste", date: "20 out 2026", body: "Diário, semanal e mensal com tabelas mock para validar a experiência." },
  { tag: "Coleções", title: "5 coleções originais reveladas", date: "15 out 2026", body: "Crimson, Obsidian, Celestial, Sovereign e Phantom — arte própria em produção." },
];