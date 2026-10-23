# MU Legacy Arena — Portal & Painel (PROTÓTIPO DEMO)

Frontend administrativo e portal de comunidade para um MMORPG privado clássico **original**.
Não é game server, não está integrado ao jogo, não processa pagamentos. Sem assets proprietários.

## Rotas
`/` home · `/jogador` painel · `/editor` editor de itens · `/rankings` PvP · `/premios` · `/mercado` TradePay (demo) · `/carteira` (simulada) · `/admin` (demonstrativo) · `/regras` FAQ

## Estado
Todo estado é local (`src/lib/demo-store.ts`, localStorage). Nunca SQL real, nenhum backend provisionado.

## Regras de domínio (`src/lib/game-rules.ts`)
- Classes BK, SM, ME, MG e **DL obrigatório** com atributo **Command**.
- Editor do jogador: +0..+11. **Enforcement server-side futuro** (o cliente só pré-valida).
- +12..+15: distribuição premium **somente eventos oficiais e Donate**.
- Aparência transparente só +12..+15 — renderização futura no cliente de jogo.
- Força relativa do mesmo item: +11=100, +12=102, +13=105, +14=108, +15=111 — **metas configuráveis de teste**, balanceamento não comprovado.
- Objetivo: +11 ALL completo + build estratégica deve ter chances contra +13/+14 incompleto.
- Ranking principal aceita todos os itens até +15.
- Prêmios: semanal = 2 partes distintas do mesmo set +13 (rodízio Crimson/Obsidian/Celestial/Sovereign/Phantom); evento semanal = 1 parte; mensal = 1 arma +15 da classe escolhida.
- Economias e recompensas **não são reais**.

## Integração futura (`src/lib/api-contracts.ts`)
Browser → API Gateway → Serviço do Portal → fila → Bridge Windows → GameServer / SQL Server.
- **Nunca** conectar o browser diretamente à base de inventário.
- **Anti-dupe**: serial único por item emitido pelo servidor; serial duplicado → quarentena + alerta.
- **Inventory ownership**: validar accountId + characterId + serial + inventoryVersion (lock otimista) em toda operação.
- **Item reservation**: item anunciado fica travado no jogo até liquidar/cancelar/expirar (TTL).
- **Webhooks idempotentes**: `Idempotency-Key`/`eventId` + tabela de eventos processados; assinatura HMAC.
- **Compensações (saga)**: cada etapa tem ação inversa (unreserve, refund, devolver item) auditada.
- **Pagamentos**: apenas via provedor de pagamento regulado, com KYC e conciliação. Não implementado.
- Escrow: listed → reserved → awaiting_payment → paid → pending_delivery → delivered → settled (+ cancelled/refunded).

## Testes
`bunx vitest run src/test/game-rules.test.ts`