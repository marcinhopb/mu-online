# MU EC — DOCUMENTO MESTRE DO PROJETO
**Atualizado:** 23/10/2026  
**Projeto:** MU EC — MU 100% Editável  
**Foco:** PvP competitivo, personalização, eventos, guildas e comércio entre jogadores.

> Este documento registra os requisitos e decisões discutidos no ChatGPT para continuidade em outro chat ou ambiente. Não é transcrição literal nem declaração de que funcionalidades ainda planejadas estejam implementadas. O código atual está neste repositório.

## 1. Identidade e visão do produto

- Nome oficial: **MU EC**.
- Apresentação: **MU 100% Editável, focado em PvP**.
- Mensagem de posicionamento sugerida: **Seu equipamento. Sua estratégia. Sua vitória.**
- Experiência desejada: nostalgia de MU PvP no estilo MuAwaY do fim de 2017, com guildas, rivalidades, mata-mata, prêmios, mercado, disputas e prestígio de itens.
- Classes obrigatórias: BK, SM, ME, MG e DL (Dark Lord, incluindo atributo Command). A base do servidor e cliente devem suportar o DL; um MU 97D puro não o inclui naturalmente.
- Prioridade: **construir primeiro um site acessível via navegador, com painel do jogador e painel administrativo/atendimento**, antes do servidor de jogo completo.
- Trabalhar sem Lovable e **não consumir créditos do Lovable**. Usar código próprio e alternativas gratuitas; não contratar hospedagem ou serviços pagos sem aprovação.
- O usuário quer delegar a produção técnica e apoiar com decisões, sem precisar executar programação. Ferramentas e acessos existentes determinam o que o assistente consegue configurar diretamente.
- O site e a marca devem ser originais. MuAwaY é referência para estrutura e experiência, não autorização para copiar logos, arte, textos, código-fonte ou arquivos proprietários.
- Atenção a propriedade intelectual e licenciamento do MU Online/WEBZEN antes de operação comercial.

## 2. Regras de edição de equipamentos

- **Todos os modelos de itens elegíveis** podem ser editados pelo proprietário do item de **+0 até +11**, via site/painel.
- Escolha de Luck, Skill, Additional e opções Excellent conforme o tipo e as restrições de cada item; não permitir opções incompatíveis.
- Todos os modelos futuros de set/equipamento seguem o mesmo limite geral.
- Níveis **+12, +13, +14 e +15** somente por **eventos oficiais da staff ou Donate**; não editáveis pelo jogador no editor comum.
- Aparência: **+0 a +11 sem transparência; +12 a +15 com efeito transparente no modelo do equipamento**. A renderização visual depende do cliente de jogo, não do painel web.
- Validações devem ocorrer no GameServer/backend: item serializado, titularidade, lock/transação, trilha de auditoria, anti-dupe e regras de edição. O navegador não pode conceder níveis ou itens premium.

## 3. Balanceamento obrigatório de PvP

- O número de melhoria do mesmo item deve aumentar força de maneira perceptível, progressiva, mas **moderada**.
- **Curva exploratória**, relativa ao mesmo item, *ainda não validada em duelos*: +11 = 100; +12 = 102; +13 = 105; +14 = 108; +15 = 111.
- O avanço de nível não pode se transformar em multiplicadores excessivos após considerar set, arma, wings, anéis, pendant, reflect, vida, defesa, resistência, Excellent e buffs.
- Personagem equipado com **ALL completo +11** e build estratégica (set, arma, asas e acessórios aplicáveis à classe) deve ter **chance real de vencer** oponentes que possuam somente set+arma +13/+14 ou até +15 incompleto.
- Um personagem **ALL +15 completo** tem vantagem, mas **não é invencível**.
- Ranking principal e eventos PvP oficiais aceitam todos os níveis **até +15**. Uma modalidade restrita +11 pode existir apenas como evento alternativo.
- PvP equilibrado entre **BK, SM, ME, MG e DL**, evitando excesso de reflect, redução de dano, absorção, vida e evasão. Validar com centenas de duelos controlados por classe e configurações.
- Criações custom futuras não devem desvalorizar instantaneamente os sets antigos ou desequilibrar o combate.

## 4. Rankings, eventos e prêmios

- **Rankings diário, semanal e mensal** de vitórias em eventos oficiais PvP.
- Ranking diário: reconhecimento e premiação menor (Golds ou equivalente).
- Ranking semanal: campeão recebe **duas partes +13 diferentes**, sorteadas do **mesmo set especial** em destaque; cinco famílias de set em rodízio. O catálogo definitivo dos sets deve ser confirmado.
- Mata-Mata especial semanal: prêmio de **uma parte +13** (modalidade adicional proposta).
- Ranking mensal: campeão recebe **uma arma Full Excellent +15**, escolhida de acordo com a classe.
- Rankings oficiais precisam auditar confrontos, evitar farming de contas alternativas, conluio e manipulação da staff.
- Guild wars, MT-MT, eventos, rankings de PK/resets e outros modos clássicos são elementos desejados.

## 5. Economia, Donate e TradePay

- Novos modelos de sets/itens podem ser adicionados periodicamente, e alguns vendidos por Donate, **sem tornar o servidor pay-to-win invencível**.
- O mercado **TradePay** propõe comércio de itens entre jogadores, com preço em reais, Pix ou saldo na plataforma, depósito e saque pelo site.
- Fluxo obrigatório futuro: anúncio -> reserva segura do item no servidor -> criação da cobrança -> confirmação autêntica do PSP -> entrega ao comprador -> crédito ao vendedor -> liquidação/saque; tratamento de cancelamentos e falhas.
- Proteções: número serial único, trava do inventário, idempotência de webhooks, saga/transações compensatórias, auditoria e antifraude; considerar KYC, prevenção à lavagem de dinheiro, contestações e regras de intermediadores financeiros.
- **Não ligar Pix real, saques, Donate ou saldo financeiro verdadeiro até concluir segurança, integração e validação contratual/regulatória.**
- O protótipo atual contém **simulações** e não deve exibir QR Pix fictício como se recebesse dinheiro.

## 6. Site — referência de experiência

Referências visuais enviadas pelo usuário:
1. **Home clássica MuAwaY:** banner medieval, menu horizontal, coluna lateral, ranking com diversas modalidades, notícias, loja, atalhos, equipe e chat.
2. **Painel moderno da conta:** fundo de castelo/fantasia escuro, menus superiores Notícias / Suporte / Shop / Fórum, navegação lateral Detalhes da conta / Jogo / Personagens / Segurança, painéis pretos/cinzas, bordas e ícones dourados e alta legibilidade.
3. **Tela Jogo:** status online/offline, servidor, última conexão, saldos GoldsWay/Gold/JC Point, ferramentas de conversão (regras específicas a implementar).
4. **Baú:** quantidade, compra de baús, status travado e recuperação de senha.
5. **Detalhes da conta:** login, nome, nascimento, país, e-mail, telefone; visual com dados protegidos e edição autenticada.
6. **Personagens:** relação de personagens vinculados, avatars por classe, resets, painel expansível de ações.
7. **Segurança:** PID/senha secundária, recuperação protegida.
8. **Shop:** página própria, pacotes, carrinho, simulador de créditos, informações de segurança, pagamentos e ajuda. Construir uma loja **original MU EC**, não copiar desenhos ou logotipos.
9. **Equipe:** cargos Admin, Sub Admin, GM, Moderador e outros; listagem, presença online/offline e ferramenta de agradecimentos/mensagens.
10. **Chat de suporte humano:** widget diretamente no site, conversas atribuídas a moderadores, mensagens e histórico; painel de atendimento separado, permissões por função, privacidade e antispam.

Estilo-alvo: mistura de **portal clássico de MU** com **área de conta premium escura e detalhes dourados**. O usuário enviou capturas de tela como referências; estas não precisam ser publicadas em repositório público.

## 7. Funcionalidades que o site deve ter

### Público
- Home, notícias, downloads (quando houver cliente), registro e login, ranking, eventos, calendário, guildas, fórum/comunidade, membros da equipe, FAQ, termos, privacidade e suporte.
- Shopping original do MU EC (loja futura; compras desativadas até aprovação).
- Chat diretamente pelo site com um **moderador humano**, sem fingir resposta humana quando não houver ninguém atendendo.

### Jogador autenticado
- Informações da conta e recuperação segura.
- Dados de jogo, moedas/saldos, personagens e resets.
- Segurança e PIN/PID secundário com armazenamento seguro e fluxos de recuperação; jamais exibir segredos em texto puro.
- Baús, inventário, editor até +11, opções Excellent válidas, ranking, eventos e recompensas.
- Histórico de compras e negociações, acompanhamento do TradePay futuramente.

### Staff/administrador
- Login e controle de permissões para admin, GM e moderador.
- Painel de notícias/eventos, cadastro de equipe, agenda de eventos, atendimento de conversas por moderador.
- Ferramentas futuras de jogadores, itens, guildas, rankings e auditoria com autoridade exclusiva do backend/GameServer.
- Nunca disponibilizar ações administrativas reais ao público sem autenticação forte e autorização no servidor.

## 8. O que já existe no GitHub

Repositório: **https://github.com/marcinhopb/mu-online**  
Arquivos de versões anteriores no mesmo repositório:
- `index.html`, `public.css`, `public.js`: site clássico.
- `portal.html`, `styles.css`, `app.js`: portal demonstrativo/interativo (sem GameServer).
- `staff.html`, `staff.css`, `staff.js`: interface administrativa e de atendimento.
- `server.mjs`, `chat-live.js`: backend local Node, suporte e cadastro/login demonstrativos.
- `tests/smoke.mjs`: testes locais.
- `docs/arquitetura.md`: arquitetura prevista.

**Estado real:** protótipo de site + backend de testes locais; **não** há GameServer funcionando, SQL de inventário real conectado, Pix, saque, Donate ou hospedagem completa verificada. GitHub Pages serve conteúdo estático e **não** executa o backend Node de chat/login/admin. Testes locais não equivalem a implantação em produção.

## 9. Infraestrutura e custos

- Restringir novos gastos a **R$ 0 sem autorização**.
- Github (código/versionamento) e GitHub Pages (parte estática para repositório público) são caminhos gratuitos dentro de limites; ativação da hospedagem ainda precisa ser confirmada.
- Para chat real online e login persistente, usar uma opção de backend gratuito dentro de limites técnicos ou atendimento externo gratuito, sujeito às condições de cada serviço. Uma implantação real exige ambiente persistente, segurança e política de proteção de dados.
- Nenhuma ferramenta tem acesso automático ao PC do usuário ou pode instalar MuServer no computador sem meio autorizado.
- Não chamar Lovable, não gerar créditos Lovable.

## 10. Próximas tarefas prioritárias

1. Consolidar toda a marca visual e os textos sob **MU EC**.
2. Atualizar a página inicial e área do usuário, tomando as referências como **inspiração visual**, com arte própria.
3. Tornar cada aba navegável e responsiva; diferenciar funcionalidades reais de demonstração.
4. Estruturar painel administrativo com permissões, atendimento humano, notícias e eventos.
5. Publicar frontend em URL verificável gratuitamente, e escolher estratégia viável para chat/login reais sem novos custos.
6. Validar autenticação, CSRF, rate limiting, sessões, senhas, segurança de dados e persistência antes do público.
7. Quando houver base de jogo compatível, integrar GameServer/SQL e testar edição item +11, rankings e PvP.
8. Somente depois integrar monetização e marketplace com garantias legais e operacionais.

## 11. Prompt para continuar o projeto em novo chat

"Continue o projeto **MU EC — MU 100% Editável**, focado em PvP, conforme o documento `docs/MU-EC-PROJETO-MESTRE.md` no repositório GitHub `marcinhopb/mu-online`. A primeira prioridade é concluir um site original no estilo de portal clássico de MU e painel de usuário moderno dark/gold, com admin e chat moderado, mantendo custo zero e sem usar Lovable. Antes de desenvolver, consulte o código atual e este dossiê. Não prometa recursos em produção que ainda estejam em modo DEMO. Preserve todas as regras de edição até +11, +12 a +15 especiais, e PvP balanceado."

---
**Nota:** este documento é uma síntese abrangente de requisitos e progresso; para preservar cada palavra e imagem da conversa, use também o recurso de compartilhar/exportar a conversa do ChatGPT.
