# MU EC — MU 100% Editável

**Seu equipamento. Sua estratégia. Sua vitória.** Portal original de MU com foco em PvP, área do jogador e atendimento humano. HTML, CSS, JavaScript e Node.js nativos, sem dependências npm obrigatórias e sem serviços pagos.

As decisões do produto estão em [docs/MU-EC-PROJETO-MESTRE.md](docs/MU-EC-PROJETO-MESTRE.md). O jogo completo ainda não está integrado: este repositório implementa o site e um backend de desenvolvimento, não um GameServer.

## Executar o site e a API

Requer **Node.js 20 ou superior**; validado com Node.js 24. Não é necessário executar `npm install` nem compilar assets.

Na raiz do projeto:

```bash
node server.mjs
```

Abra a porta 3000 no navegador local. O servidor usa o endereço de loopback por padrão. `index.html` é o site público, `portal.html` é o painel do jogador e `staff.html` é a central da equipe. A API deve ser servida na mesma origem do frontend.

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP; padrão `3000`. |
| `MU_HOST` | Interface de rede; padrão `127.0.0.1`. Use outra interface apenas no ambiente que pretende disponibilizar. |
| `MU_DATA_FILE` | Caminho do banco JSON; padrão `.data/store.json`, ignorado pelo Git. |
| `MU_ADMIN_EMAIL` | E-mail da conta administrativa inicial. |
| `MU_ADMIN_PASSWORD` | Senha inicial de 12 a 256 caracteres, fornecida com segurança ao processo. |
| `MU_ADMIN_NICK` | Nome inicial do administrador; padrão `Administrador`. |
| `MU_HTTPS` | `true` adiciona `Secure` ao cookie atrás de HTTPS. Não habilita TLS no Node. |

O site inicia sem credenciais administrativas. Para ativar a primeira conta da equipe, forneça `MU_ADMIN_EMAIL` e `MU_ADMIN_PASSWORD` por variáveis de ambiente locais seguras e reinicie o servidor. Não salve valores no Git, em scripts públicos ou em conversas. A conta só é criada se ainda não houver administrador; essas variáveis não alteram uma senha já cadastrada.

Cadastre as demais contas pelo site e atribua funções na central autenticada. Nenhuma senha administrativa padrão é fornecida.

## O que funciona neste backend

- Cadastro e login da conta do site, identificação da sessão e logout.
- Atendimento humano: abertura de conversa pelo visitante, histórico protegido, atribuição a um atendente, respostas e encerramento pela equipe.
- Notícias e agenda de eventos publicadas pela equipe, lidas nas páginas públicas.
- Diretório público da equipe sem e-mails ou indicadores inventados de presença.
- Administração de funções, com bloqueio da remoção do último administrador.

| Função | Atendimento | Notícias e eventos | Gestão de funções |
| --- | --- | --- | --- |
| Jogador | Sua conversa com token | Leitura pública | Não |
| Moderador | Sim | Leitura pública | Não |
| GM | Sim | Publicar e remover | Não |
| Administrador | Sim, incluindo reatribuição | Publicar e remover | Sim |

A autorização acontece no servidor. Um atendente não administrador não pode assumir ou responder uma conversa atribuída a outra pessoa. O chat é uma fila de atendimento e não garante que haja um moderador disponível naquele instante.

## Demonstrações e etapas futuras

Personagens, inventário, editor, rankings, prêmios e TradePay são demonstrações explícitas. Os dados reais da conta do site não representam uma conta de jogo conectada. Saldos, saques, Pix, compras, Donate e concessão de itens reais não estão habilitados. Não há download de cliente ou fórum de terceiros configurado.

Preservam-se as regras: editor comum de +0 a +11; +12 a +15 reservados a eventos oficiais ou Donate futuro; BK, SM, ME, MG e DL com Command; ranking principal até +15; duas partes distintas do mesmo set +13 como prêmio semanal e arma Full Excellent +15 por classe como prêmio mensal. A curva de força do documento é uma hipótese que ainda precisa de duelos controlados.

## Verificar

Da raiz do projeto:

```bash
node --test tests/smoke.mjs tests/backend.mjs
```

Os testes iniciam servidores isolados com bancos temporários e credenciais exclusivas de teste. Cobrem cadastro, sessões, funções, permissões administrativas, privacidade, proteção de origem, corpo JSON, limites de tentativas, chat, notícias, eventos e persistência após reinício. Não alteram o banco de desenvolvimento. A suite não equivale a auditoria de segurança ou integração com jogo/pagamentos.

Para confirmar disponibilidade da aplicação, `GET /api/health` deve responder `ok: true`, `service: "mu-ec-portal"` e `gameServer: "not_connected"`. Abra também as três páginas para verificar a interface.

## Persistência e publicação

Usuários, conversas, notícias e eventos ficam em um único arquivo JSON, com substituição atômica e escrita serializada. Sessões e limites de tentativas ficam em memória; reiniciar o servidor encerra sessões. Execute **uma única instância** por arquivo. Não use dados pessoais reais neste protótipo sem concluir a política e os controles de proteção de dados.

Hospedagem pública ainda exige HTTPS, banco transacional, backups, monitoramento, recuperação de conta, revisão de segurança e políticas aprovadas. Os textos de termos e privacidade do site são informativos de desenvolvimento, não documentos jurídicos aprovados.

GitHub Pages pode servir somente o frontend estático: não executa o Node e não torna login, chat ou central administrativa operacionais. Não há implantação pública verificada neste marco. O widget externo opcional permanece desativado; qualquer configuração posterior deve respeitar a privacidade, os limites gratuitos e a autorização do titular.

A identidade e a arte do portal são próprias. Não há assets proprietários do MuAwaY nem cliente/servidor comercial neste pacote. Os direitos pertinentes ao MU Online/WEBZEN devem ser avaliados antes de operação comercial.
