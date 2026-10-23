# MU Legacy Arena — edição independente, sem créditos Lovable

Este pacote é uma **primeira versão funcional de demonstração do portal web** para um servidor de RPG clássico inspirado em MU 2017 com Dark Lord. Foi desenvolvido diretamente em HTML, CSS e JavaScript — **não é necessário Lovable, npm, servidor web ou cadastro** para abrir o protótipo.

## Como abrir

1. Extraia o arquivo ZIP em uma pasta.
2. Dê dois cliques em `index.html` para abrir no navegador moderno.
3. Explore editor de itens, rankings, premiações e negociação DEMO pelo menu.

Os dados de exemplo e as configurações do inventário ficam no `localStorage` do navegador. Limpar os dados do navegador apaga a demonstração. O botão "Restaurar demonstração local" pode reiniciar os dados.

## O que está realmente implementado

- Layout completo e adaptável a desktop/celular; 9 telas navegáveis.
- Inventário de teste com itens, classes e atributos.
- Editor interativo com limite +11, Luck, Skill e whitelists de Excellent por tipo. +12 a +15 bloqueados e marcados como premium.
- Ranking diário/semanal/mensal com seleção de classe (dados fictícios).
- Sorteio aleatório demonstrativo de duas partes distintas de um set +13, com cinco coleções em rodízio.
- Prêmios mensais com arma +15 e suporte à classe DL.
- Mercado DEMO com fluxo de reserva → pagamento simulado → entrega simulada → repasse simulado.
- Carteira demonstrativa, sem depósitos ou saques reais.
- Página administrativa com metas de balanceamento e regras do projeto.

## O que **não** foi implementado

- Não há cliente de jogo, MuServer, SQL Server, personagem real ou integração com inventário.
- Não há autenticação real. "Conta de teste" é somente ficcional.
- Não há pagamentos Pix reais, QR Code financeiro, fundos, escrow, saque ou crédito verdadeiro.
- Não há loja Donate operacional nem emissão de itens premium reais.
- Valores/nomes dos itens e rankings são fictícios; estatísticas do PvP são hipóteses de design, não resultados de teste.

## Requisitos de produção

Para evoluir o projeto para servidor real, é necessário confirmar a base técnica do GameServer compatível com DL, licenças de uso, esquema de inventário e seriais, regras de opção dos itens, arquitetura de autenticação segura e provedor de pagamentos autorizado que aceite o modelo de negócio. Consultar `docs/arquitetura.md`.

## Custos

Este pacote, rodando localmente, é gratuito e **não gasta créditos do Lovable**. Isso não implica que operar online com proteção, cliente de jogo, hospedagem e transações financeiras seja gratuito.

## Direitos e propriedade intelectual

O protótipo usa símbolos tipográficos e nomes inventados, e não inclui arquivos, texturas, logotipos ou código proprietário do MU Online, MuAwaY ou WEBZEN. Publicar um jogo comercial requer avaliação dos direitos de uso pertinentes.