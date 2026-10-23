/**
 * Contratos de API DESACOPLADOS para integração futura.
 *
 * Arquitetura alvo:
 *   Browser → API Gateway (auth, rate-limit) → Serviço de Portal → fila → Bridge Windows → GameServer / SQL Server
 *
 * Regras invioláveis:
 * - O browser NUNCA conecta diretamente na base de inventário (SQL Server).
 * - Todo item possui `serial` único (64-bit) emitido pelo servidor; duplicatas de serial = alerta anti-dupe e quarentena.
 * - Ownership: toda operação valida accountId + characterId + serial + inventoryVersion (lock otimista).
 * - Reserva: item anunciado/editado fica `reserved` (travado no jogo) até liquidar, cancelar ou expirar (TTL).
 * - Webhooks idempotentes: header `Idempotency-Key` + tabela de eventos processados; reprocessar é no-op.
 * - Compensação (saga): toda etapa tem ação inversa (unreserve, refund, return item) registrada em auditoria.
 * - Pagamentos reais SOMENTE via provedor de pagamento regulado (PSP/IP autorizado), com KYC e conciliação. Não implementado.
 * - Limite +11 no editor e +12..+15 só via evento/donate são aplicados no servidor; o cliente apenas exibe.
 */
import type { CharClass, ItemOptions, SlotType, TradeState } from "./game-rules";

export interface ItemDTO {
  serial: string;
  ownerAccountId: string;
  characterId: string;
  slot: SlotType;
  name: string;
  collection?: string;
  options: ItemOptions;
  origin: "drop" | "editor" | "event" | "donate" | "trade";
  reserved: boolean;
  inventoryVersion: number;
}

/** POST /v1/items/{serial}/edit — servidor rejeita level > 11 com 422. */
export interface EditItemRequest {
  serial: string;
  characterId: string;
  expectedInventoryVersion: number;
  options: ItemOptions;
  idempotencyKey: string;
}
export interface EditItemResponse { item: ItemDTO; auditId: string }

/** POST /v1/market/listings */
export interface CreateListingRequest { serial: string; priceBRLCents: number; idempotencyKey: string }
export interface ListingDTO {
  id: string; serial: string; sellerAccountId: string; buyerAccountId?: string;
  priceBRLCents: number; state: TradeState; history: { state: TradeState; at: string }[];
}

/** POST /v1/webhooks/payments — vindo do PSP regulado (assinatura HMAC verificada). */
export interface PaymentWebhook {
  eventId: string; // chave de idempotência
  listingId: string;
  status: "paid" | "failed" | "refunded";
  signature: string;
}

/** POST /v1/rewards/grant — somente sistema de eventos / admin com dupla aprovação. */
export interface GrantRewardRequest {
  characterId: string; reason: "weekly_champion" | "weekly_event" | "monthly_champion" | "donate";
  items: { slot: SlotType; level: 12 | 13 | 14 | 15; collection?: string; forClass?: CharClass }[];
  approvedBy: [string, string];
}

export interface AuditEntry {
  id: string; at: string; actor: string; action: string; target: string; detail: string;
}