# MU EC — andamento de desenvolvimento

Marco de 23/10/2026: portal público, painel do jogador e central da equipe.

## Entregue no código

- Identidade MU EC, visual escuro com detalhes dourados e arte vetorial original local.
- Navegação pública, notícias, agenda, equipe, ajuda, termos e privacidade informativos.
- Conta do site autenticada no painel, e-mail ocultável e logout; abas de jogo, personagens, baús e segurança com estados honestos para integrações ausentes.
- Editor demonstrativo com limite +11, opções por categoria e bloqueio do item especial +15.
- Atendimento humano com histórico, atribuição e encerramento; papéis de moderador, GM e administrador.
- Gestão de notícias, eventos e funções com autorização no backend, proteção do último admin e persistência JSON em instância única.
- Validação de origem e JSON, limites de tentativas, sessões HttpOnly/SameSite e regressões de revogação de cargo e colisão de bootstrap.

## Evidência

`node --test tests/smoke.mjs tests/backend.mjs`: **16 testes aprovados**, nenhum ignorado.

Validação com Chromium/Playwright em servidores temporários: 12 rotas públicas e 12 abas do jogador em desktop e celular; identidade autenticada; cadastro e login; bloqueio do painel staff para jogador; resposta humana no chat; notícia e evento visíveis no portal; encerramento e nova conversa; quatro abas staff no celular sem overflow horizontal; editor +11, opções por categoria, salvamento explícito e item +15 bloqueado. Nenhum erro JavaScript não tratado foi observado nos fluxos verificados.

Os testes do navegador usaram dados e credenciais descartáveis. Não criaram uma conta administrativa para o titular nem validaram acesso público pela internet.

## Ainda não entregue

- GameServer, cliente de jogo, SQL e inventário real.
- Balanceamento comprovado por duelos e concessão real de recompensas.
- Pix, Donate, saques ou TradePay com dinheiro real.
- Recuperação de conta, PIN, 2FA, auditoria operacional completa e infraestrutura de produção.
- Publicação pública: o conector Sites solicitado não disponibilizou ferramentas nesta conversa. O pacote estático é um artefato de entrega, não uma URL publicada.

A branch de desenvolvimento para revisão é `preview/mu-ec-site`. A captura em `docs/previews/mu-ec-home.png` registra a página inicial. Não há configuração de GitHub Pages nem implantação do site neste marco. Publicar um frontend estático não executa o backend de login e atendimento. As decisões completas permanecem no [documento mestre](MU-EC-PROJETO-MESTRE.md).
