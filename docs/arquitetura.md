# Arquitetura de referência — do protótipo ao servidor real

## Camadas

1. **Web frontend**: painel de usuários e administração; usa APIs autenticadas, nunca grava itens no SQL diretamente.
2. **Backend de aplicação**: sessão, contas, ACL, limites de edição, emissão de recompensas, ledger auditável, marketplace.
3. **Game-server bridge**: serviço isolado que conversa com o servidor de jogo autorizado. Valida serial, titularidade, status offline, slots, cliente e lógicas de entrega com checkpoints.
4. **GameServer/SQL**: fonte de verdade para inventário, equipamentos, estados do jogador e registros dos itens; versão exata depende da base escolhida.
5. **Provedor financeiro**: custódia e liquidação por instituição apropriada, com Pix, webhook assinado, estornos, KYC/AML, limites e saques.

## Contratos HTTP planejados (não operacionais)

- `GET /api/me/characters` — personagens autenticados.
- `GET /api/me/inventory?character=...` — lista de equipamentos com serial único e tipo.
- `POST /api/items/{serial}/edit` — nível de 0 a 11 com whitelist, validação server-side, locks, serial, auditoria, idempotência.
- `GET /api/pvp/ranking?period=daily|weekly|monthly` — vitórias de eventos oficiais concluídos.
- `POST /api/admin/events/{id}/settle` — liquidação do evento protegida com RBAC, auditoria, revisão.
- `POST /api/trades` — criar proposta de trade reservando item no GameServer.
- `POST /api/trades/{id}/accept` — aceitação do comprador.
- `POST /api/trades/{id}/pay` — criar cobrança real pelo PSP, sujeito à elegibilidade.
- `POST /api/webhooks/psp` — webhook com autenticação, deduplicação, conciliação de recursos.
- `POST /api/trades/{id}/deliver` — operação autenticada pelo sistema, não pelo cliente.
- `POST /api/wallet/withdrawals` — solicitar saque via PSP para beneficiário verificado, somente com autorização.

## State machine financeira planejada

`listed → reserved → awaiting_payment → payment_confirmed → pending_delivery → delivered → settled`.

Estados de exceção: `expired`, `cancelled`, `delivery_failed`, `refund_pending`, `refunded`, `chargeback_review`.

- Nunca aceitar captura de tela Pix como comprovante.
- Se Pix confirmado mas entrega falhar, bloquear repasse; executar recuperação idempotente ou devolução conforme contrato do PSP.
- Nunca duplicar seriais ou sobrescrever itens. Garantir que inventário de destino tem espaço ou usar caixa postal transacional própria.
- Controle de concorrência: bloqueio/lease do item com expiração e serial verificável; reconciliação periódica.
- Ledger de dupla entrada mantido com PSP como fonte de verdade dos fundos, não créditos sem respaldo.
- Não habilitar automaticamente itens +12 a +15 no editor mesmo em requests forjadas.

## Balanceamento de PvP

- Classes: BK, SM, ME, MG, DL com Command funcional.
- Item +11 índice relativo = 100; +12=102; +13=105; +14=108; +15=111 (hipóteses de força base do mesmo equipamento; não acumuláveis multiplicativamente com bônus da raridade).
- Visual sem transparência até +11; transparência do equipamento nos +12 a +15 implementada no renderizador do cliente, nunca como regra de dano.
- Todas as modalidades do ranking principal aceitam até +15. Item +11 com conjunto ALL completo, acessórios e build estratégica deve ter chance real contra +13/+14 com set+arma incompletos.
- Registrar centenas de duelos controlados por matchup e distância de equipamento antes de afirmar probabilidades de vitória.
- Limitar reflect, redução de dano, sustain, esquiva e multiplicadores Excellent; nenhum jogador deve ser invulnerável.

## Cronograma lógico

1. Portal demonstrativo (este pacote).
2. Seleção da base do GameServer com DL, inventário e licença compatíveis.
3. Autenticação real e backend em ambiente isolado, jamais SQL exposto ao site.
4. Integração de inventário OFFLINE e editor server-side.
5. Rankings/eventos com logs e testes de anti-cheat/anti-dupe.
6. Comércio não financeiro e testes de entrega.
7. Avaliação jurídica dos direitos do jogo e aceitação do PSP antes de liberar comércio em reais.
8. Beta fechado e testes de segurança antes de hospedagem pública.