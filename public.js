/* MU EC — portal público. Recursos de jogo demonstrativos nunca alteram a API. */
'use strict';
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const notify = message => {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $('toast').classList.remove('show'), 5000);
};
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};
let apiOnline = false;
let session = null;
let activeRank = 'semana';
let currentPage = 'home';
let chatId = storage.get('mu_chat_id');
let chatToken = storage.get('mu_chat_token');
let chatClosed = false;
let lastTranscript = '';
const roles = { admin: 'Administrador', gm: 'Game Master', moderator: 'Moderador', player: 'Jogador' };
const isStaff = user => ['admin', 'gm', 'moderator'].includes(user?.role);
async function api(route, options = {}) {
  const response = await fetch(`/api${route}`, {
    credentials: 'same-origin', signal: AbortSignal.timeout(10000), ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Não foi possível concluir esta operação. Tente novamente.');
    error.status = response.status;
    throw error;
  }
  return data;
}
const ranks = {
  dia: [['NightElf', 'ME', 5], ['LendarioBK', 'BK', 4], ['DarkLordX', 'DL', 3], ['Eternity', 'SM', 2], ['WarChief', 'MG', 1]],
  semana: [['LendarioBK', 'BK', 17], ['DarkLordX', 'DL', 15], ['NightElf', 'ME', 13], ['Eternity', 'SM', 10], ['WarChief', 'MG', 9]],
  mes: [['DarkLordX', 'DL', 66], ['LendarioBK', 'BK', 61], ['Eternity', 'SM', 57], ['NightElf', 'ME', 48], ['WarChief', 'MG', 40]],
  guildas: [['OldAlliance', 'Guilda', 44], ['DragonWar', 'Guilda', 39], ['DarkLegion', 'Guilda', 32], ['Rebirth', 'Guilda', 27], ['Honor', 'Guilda', 21]]
};
function title(text, description = '') {
  return `<div class="section-toolbar"><h1 tabindex="-1">${text}</h1><small>${description}</small></div>`;
}
function emptyState(heading, description) {
  return `<div class="empty-state"><strong>${escapeHtml(heading)}</strong>${escapeHtml(description)}</div>`;
}
function newsMarkup(articles) {
  return articles.map(article => {
    const date = new Date(`${article.date}T12:00:00`);
    const validDate = !Number.isNaN(date.getTime());
    const day = validDate ? String(date.getDate()).padStart(2, '0') : '—';
    const month = validDate ? date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase() : 'MU EC';
    return `<article class="news-card"><div class="news-date"><strong>${day}</strong><small>${month}</small></div><div class="news-content"><div class="tag">${escapeHtml(article.kind || 'COMUNICADO')}</div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.body)}</p><div class="news-foot">${escapeHtml(article.by || 'Equipe MU EC')}${validDate ? ` · ${escapeHtml(date.toLocaleDateString('pt-BR'))}` : ''}</div></div></article>`;
  }).join('');
}
function home() {
  return `<section class="hero"><div class="eyebrow">MU 100% EDITÁVEL · PVP CLÁSSICO</div><h1 tabindex="-1">Seu equipamento.<br />Sua estratégia.<br /><em>Sua vitória.</em></h1><p>Reviva o espírito das guildas, encontre sua classe e prepare seu legado em uma nova arena.</p><div class="hero-actions"><a class="btn-gold" href="portal.html#inicio">EXPLORAR O PAINEL ↗</a><a class="btn-outline" href="#cadastro">CRIAR CONTA</a></div><div class="hero-status"><i class="status-dot"></i> Projeto em desenvolvimento · jogo ainda não disponível</div></section>
  <div class="pillars"><div class="pillar"><b>05</b><span>CLASSES CLÁSSICAS</span></div><div class="pillar"><b>+11</b><span>EDIÇÃO PLANEJADA</span></div><div class="pillar"><b>PvP</b><span>FOCO COMPETITIVO</span></div></div>
  <section><div class="section-toolbar"><h2>Últimas notícias</h2><a href="#noticias">TODOS OS COMUNICADOS →</a></div><div id="news-cards">${emptyState('Comunicados da equipe', 'Verificando as notícias publicadas no portal…')}</div></section>
  <section><div class="section-toolbar"><h2>A essência do MU EC</h2><small>NOSSA PROPOSTA</small></div><div class="mini-grid"><article class="promo-card"><span class="promo-number">Ⅰ</span><h3>Uma build. Muitas escolhas.</h3><p>Editor do jogador de +0 a +11. Opções válidas para cada equipamento; níveis +12 a +15 reservados a eventos oficiais ou Donate futuro.</p><a href="portal.html#editor">EXPERIMENTAR EDITOR DEMO →</a></article><article class="promo-card"><span class="promo-number">Ⅱ</span><h3>Prestígio se conquista.</h3><p>Rankings diário, semanal e mensal de eventos oficiais. PvP com todas as classes e equipamentos até +15.</p><a href="#eventos">VER REGRAS DOS EVENTOS →</a></article><article class="promo-card"><span class="promo-number">Ⅲ</span><h3>Sua guilda é sua história.</h3><p>Amizades, rivalidades e guerras em uma comunidade que valoriza a estratégia e o jogo limpo.</p><a href="#guildas">CONHECER A PROPOSTA →</a></article><article class="promo-card"><span class="promo-number">Ⅳ</span><h3>Um mundo em construção.</h3><p>O portal vem primeiro. Inventários reais, GameServer e TradePay serão integrados em etapas, com validação.</p><a href="#suporte">TIRE SUAS DÚVIDAS →</a></article></div></section>`;
}
function noticias() {
  return `${title('Notícias do MU EC', 'COMUNICADOS DA EQUIPE')}<div id="news-cards">${emptyState('Notícias do portal', 'Verificando comunicados publicados…')}</div><div class="muted-note">As publicações desta área pertencem ao portal em desenvolvimento. Anúncios de eventos não significam que o GameServer já esteja disponível.</div>`;
}
function cadastro() {
  return `${title('Crie sua conta', 'PORTAL MU EC')}<section class="simple-panel"><div class="eyebrow">SUA HISTÓRIA COMEÇA AQUI</div><h2>Bem-vindo à próxima arena.</h2><p>Esta conta dá acesso ao portal. O cadastro ainda não cria personagens nem libera acesso ao jogo.</p><form id="registration-form" class="form-grid"><label for="register-name">Nome de usuário<input id="register-name" class="entry" name="username" autocomplete="username" minlength="3" maxlength="25" pattern="[a-zA-ZÀ-ÿ0-9_-]{3,25}" title="Use letras, números, hífen ou sublinhado, sem espaços." placeholder="Seu apelido" required /><small>3 a 25 caracteres, sem espaços.</small></label><label for="register-email">E-mail<input id="register-email" class="entry" name="email" type="email" autocomplete="email" maxlength="160" placeholder="voce@exemplo.com" required /></label><label for="register-password">Senha<input id="register-password" class="entry" name="password" type="password" autocomplete="new-password" minlength="10" maxlength="256" placeholder="No mínimo 10 caracteres" required /><small>Use uma senha exclusiva para este protótipo.</small></label><p class="tiny dim">Antes de criar a conta, leia as <a class="inline-link" href="#termos">condições do protótipo</a> e as <a class="inline-link" href="#privacidade">informações de privacidade</a>.</p><button class="btn-gold" type="submit"${apiOnline ? '' : ' disabled'}>CRIAR CONTA DO PORTAL →</button><p class="muted-note" id="registration-note" role="status">${apiOnline ? 'Cadastro disponível neste servidor. Nenhum pagamento é solicitado.' : 'O cadastro precisa do servidor web. Você pode continuar explorando as demonstrações.'}</p></form></section>`;
}
function downloads() {
  return `${title('Central de downloads', 'JOGO EM PREPARAÇÃO')}<section class="simple-panel"><h2>A arena está sendo preparada.</h2><p>Ainda não existe cliente oficial do MU EC disponível. Quando a base compatível e os testes estiverem concluídos, os arquivos verificados aparecerão aqui.</p><div class="notice-row"><h3>Cliente e launcher</h3><p>Download indisponível. Não fornecemos instaladores de terceiros nem arquivos sem procedência.</p></div><div class="notice-row"><h3>Cinco classes desde a base</h3><p>BK, SM, ME, MG e DL com Command fazem parte do planejamento. A base precisa suportar todas as classes.</p></div><a class="btn-outline" href="portal.html#inicio">EXPLORAR O PORTAL DEMO ↗</a></section>`;
}
function rankTable(kind) {
  return `<div class="table-wrap"><table class="data-table"><caption class="tiny dim">Ranking ilustrativo ${kind === 'dia' ? 'diário' : kind === 'semana' ? 'semanal' : kind === 'mes' ? 'mensal' : 'de guildas'} — sem resultados reais</caption><thead><tr><th scope="col">#</th><th scope="col">${kind === 'guildas' ? 'Guilda' : 'Personagem'}</th><th scope="col">Classe</th><th scope="col">Vitórias</th></tr></thead><tbody>${ranks[kind].map((player, index) => `<tr><td>${index + 1}º</td><td>${escapeHtml(player[0])}</td><td>${escapeHtml(player[1])}</td><td>${player[2]}</td></tr>`).join('')}</tbody></table></div>`;
}
function ranking() {
  return `${title('Hall da fama', 'DEMONSTRAÇÃO')}<section class="simple-panel"><h2>Seu nome entre as lendas.</h2><p>Uma prévia dos rankings planejados para os eventos oficiais do MU EC.</p><div class="mini-tabs" aria-label="Período do ranking completo">${[['dia', 'DIÁRIO'], ['semana', 'SEMANAL'], ['mes', 'MENSAL'], ['guildas', 'GUILDAS']].map(([key, label]) => `<button type="button" data-full-rank="${key}" class="${activeRank === key ? 'on' : ''}" aria-pressed="${activeRank === key}">${label}</button>`).join('')}</div>${rankTable(activeRank)}<p class="muted-note">Nomes e pontuações acima são exemplos. O ranking principal aceitará equipamentos até +15. Os resultados reais dependerão de confrontos oficiais auditados, com prevenção a conluio e contas alternativas.</p></section>`;
}
function eventos() {
  return `${title('Eventos & conquistas', 'PVP EM PLANEJAMENTO')}<section class="simple-panel"><h2>Entre pela disputa.<br />Fique pela história.</h2><p>O planejamento valoriza vitórias legítimas, rivalidades e recompensas por mérito. Os eventos de jogo ainda não estão ativos.</p><div class="notice-row"><div class="tag">DIÁRIO</div><h3>Cada vitória conta.</h3><p>Reconhecimento no ranking do dia e premiação menor em Golds ou equivalente, conforme regras a definir.</p></div><div class="notice-row"><div class="tag">SEMANAL</div><h3>Duas partes. Um mesmo set.</h3><p>O campeão recebe duas partes +13 diferentes, sorteadas do mesmo set especial em destaque. Cinco famílias de sets em rodízio; catálogo definitivo a confirmar.</p></div><div class="notice-row"><div class="tag">MENSAL</div><h3>Uma arma à altura da conquista.</h3><p>Uma arma Full Excellent +15 de acordo com a classe do campeão: BK, SM, ME, MG ou DL.</p></div><p class="muted-note">Mata-Mata especial semanal com uma parte +13 é uma modalidade adicional proposta. Não há inscrição, entrega automática ou prêmio real disponível neste protótipo.</p></section><section><div class="section-toolbar"><h2>Agenda da equipe</h2><small>PUBLICAÇÕES DO PORTAL</small></div><div id="events-list">${emptyState('Agenda do projeto', 'Verificando eventos publicados…')}</div></section>`;
}
function loja() {
  return `${title('Shop MU EC', 'COMPRAS DESATIVADAS')}<section class="simple-panel"><div class="eyebrow">IDENTIDADE PRÓPRIA. ESCOLHAS SUAS.</div><h2>Seu estilo também entra em batalha.</h2><p>Uma prévia da proposta da loja. Não há produtos à venda, preços, cobrança, Pix ou saldo financeiro disponível.</p><div class="shop-preview"><article><b>+11</b><h3>Editor do jogador</h3><small>Até +11 nos itens elegíveis<br />Integração futura</small></article><article><b>+13</b><h3>Conquistas especiais</h3><small>Eventos oficiais planejados<br />Sem entrega real</small></article><article><b>+15</b><h3>Prestígio na arena</h3><small>Eventos ou Donate futuro<br />Compras desativadas</small></article></div><p class="muted-note">Donate e TradePay só poderão operar após validação técnica, de segurança, contratual e regulatória. O balanceamento buscará vantagem moderada sem invencibilidade; a curva ainda precisa de testes em duelos.</p><a href="portal.html#mercado" class="btn-outline">CONHECER TRADEPAY DEMO ↗</a></section>`;
}
function guildas() {
  return `${title('Guildas & comunidade', 'NENHUMA LENDA NASCE SOZINHA')}<section class="simple-panel"><h2>Vista o nome da sua guilda.</h2><p>MU EC quer recuperar a vida social do PvP clássico: formar um grupo, conhecer rivais e levar seu nome para a arena.</p><div class="mini-grid"><div class="notice-row"><h3>Guild Wars</h3><p>Guerras oficiais, regras transparentes e resultados auditáveis fazem parte do planejamento.</p></div><div class="notice-row"><h3>Hall coletivo</h3><p>Temporadas e reconhecimento de guildas. Ainda não existe cadastro ou classificação real de guildas.</p></div></div><div class="notice-row"><h3>Fórum e comunidade</h3><p>O fórum ainda não está disponível. Os canais oficiais serão divulgados aqui quando forem criados; não há links de comunidade externa ativos.</p></div><a class="btn-outline" href="#suporte">CONVERSAR COM A EQUIPE →</a></section>`;
}
function equipe() {
  return `${title('Equipe MU EC', 'PESSOAS POR TRÁS DA ARENA')}<section class="simple-panel"><h2>Uma comunidade começa pelo cuidado.</h2><p>Conheça as contas com permissões de equipe neste portal. Esta lista não representa presença online nem garante atendimento imediato.</p><div id="team-list">${emptyState('Equipe do portal', 'Verificando os membros cadastrados…')}</div><p class="muted-note">A equipe nunca precisa da sua senha ou PIN para prestar suporte. Moderação e administração reais exigem autenticação no servidor.</p><button type="button" class="btn-outline" id="open-chat-inline">ABRIR SUPORTE HUMANO →</button></section>`;
}
function suporte() {
  return `${title('Como podemos ajudar?', 'SUPORTE HUMANO')}<section class="simple-panel"><h2>Do outro lado, uma pessoa.</h2><p>Abra uma conversa e deixe sua dúvida na fila. Um membro da equipe responderá quando estiver disponível. O chat não utiliza respostas automáticas que se passam por moderadores.</p><button class="btn-gold" id="open-chat-inline" type="button">ABRIR CONVERSA →</button><h3>Perguntas frequentes</h3><details class="faq-item"><summary>Já posso entrar no jogo?</summary><p>Ainda não. O projeto está na etapa do portal. Downloads e acesso ao GameServer serão liberados quando houver uma base compatível validada.</p></details><details class="faq-item"><summary>O cadastro e o login funcionam?</summary><p>Funcionam quando o servidor web está conectado. A conta pertence a este portal de desenvolvimento e não cria personagens no jogo. Em uma hospedagem apenas estática, esses recursos ficam indisponíveis.</p></details><details class="faq-item"><summary>Posso editar equipamentos até qual nível?</summary><p>O editor demonstrativo permite de +0 até +11. Níveis +12 a +15 serão exclusivos de eventos oficiais ou Donate futuro. A edição real depende da titularidade, validação e travas no backend e no GameServer.</p></details><details class="faq-item"><summary>Um personagem +11 terá chance no PvP?</summary><p>A proposta é que uma build All +11 estratégica tenha chance real contra equipamentos superiores incompletos. Um All +15 terá vantagem moderada, sem invencibilidade. Esses objetivos ainda precisam de testes em duelos.</p></details><details class="faq-item"><summary>Posso comprar, depositar ou sacar?</summary><p>Não. Donate, Pix, compras, saldo financeiro e TradePay real estão desativados. Nenhum pagamento é solicitado por este protótipo.</p></details><details class="faq-item"><summary>Preciso enviar minha senha ao suporte?</summary><p>Nunca. Não envie senhas, PINs, documentos ou dados financeiros pelo chat. Consulte as informações de <a class="inline-link" href="#privacidade">privacidade do protótipo</a>.</p></details></section>`;
}
function termos() {
  return `${title('Condições do protótipo', 'INFORMAÇÕES DE DESENVOLVIMENTO')}<section class="simple-panel"><h2>Um projeto em construção.</h2><p>Estas são informações sobre o funcionamento atual, não uma versão final de termos comerciais ou regulamento de operação.</p><ul class="feature-list"><li><b>Portal de testes.</b> Funcionalidades podem ser alteradas, interrompidas ou ter dados de teste removidos durante o desenvolvimento.</li><li><b>Sem operação de jogo.</b> Não há GameServer integrado, itens reais, garantia de lançamento ou premiações em execução.</li><li><b>Sem operações financeiras.</b> Não há venda, Pix, depósitos, saques ou negociação com dinheiro verdadeiro.</li><li><b>Uso responsável.</b> Não utilize o portal para spam, assédio, fraude ou tentativa de obter acesso a contas de outras pessoas.</li><li><b>Identidade independente.</b> MU EC não possui afiliação à WEBZEN ou ao MuAwaY. Direitos e licenças de uma futura operação ainda precisam ser definidos.</li></ul><p class="muted-note">Antes da abertura pública serão necessários termos completos, identificação do responsável, regras de uso, canais de contato e revisão jurídica apropriada.</p><a class="btn-outline" href="#suporte">TIRAR UMA DÚVIDA →</a></section>`;
}
function privacidade() {
  return `${title('Privacidade no protótipo', 'INFORMAÇÕES SOBRE OS DADOS')}<section class="simple-panel"><h2>Use dados de teste.</h2><p>Este portal ainda não possui uma política de privacidade final aprovada para operação pública. Evite dados pessoais sensíveis e use uma senha exclusiva para o protótipo.</p><ul class="feature-list"><li><b>Conta.</b> Quando o backend está conectado, o portal armazena nome de usuário, e-mail, derivação criptográfica da senha e data de criação no armazenamento local do servidor. A senha não é exibida na interface.</li><li><b>Sessão.</b> Um cookie de sessão HttpOnly mantém o login. O término da sessão ou a reinicialização do servidor pode exigir novo login.</li><li><b>Suporte.</b> Nome de atendimento e mensagens ficam disponíveis à equipe autorizada. O identificador de acesso à conversa fica neste navegador; evite dispositivos compartilhados.</li><li><b>Demonstrações.</b> Ferramentas do painel podem usar armazenamento do navegador para dados fictícios. Elas não movimentam inventários reais nem valores financeiros.</li><li><b>Cuidados.</b> Não envie senhas, PINs, documentos, dados bancários ou informações sensíveis pelo chat. O widget externo de suporte não vem ativado.</li></ul><p class="muted-note">Prazos de retenção, canal formal para exercício de direitos, identificação do controlador e políticas de exclusão precisam ser definidos antes de disponibilização pública. Estes fluxos ainda não estão implementados.</p><a class="btn-outline" href="#suporte">FALAR COM A EQUIPE →</a></section>`;
}
const renderers = { home, noticias, cadastro, downloads, ranking, eventos, loja, guildas, equipe, suporte, termos, privacidade };
const aliases = { forum: 'guildas', comunidade: 'guildas', faq: 'suporte' };
const pageTitles = { home: 'Início', noticias: 'Notícias', cadastro: 'Cadastro', downloads: 'Downloads', ranking: 'Rankings', eventos: 'Eventos', loja: 'Shop', guildas: 'Comunidade', equipe: 'Equipe', suporte: 'Suporte', termos: 'Condições do protótipo', privacidade: 'Privacidade' };
function go(event) {
  const requested = location.hash.slice(1);
  if (requested === 'conteudo') { $('conteudo').setAttribute('tabindex', '-1'); $('conteudo').focus(); return; }
  const page = aliases[requested] || (renderers[requested] ? requested : 'home');
  currentPage = page;
  $('dynamic-content').innerHTML = renderers[page]();
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = `${pageTitles[page]} | MU EC — MU 100% Editável`;
  if (['home', 'noticias'].includes(page)) loadNews();
  if (page === 'eventos') loadEvents();
  if (page === 'equipe') loadTeam();
  if (event) $('dynamic-content').querySelector('h1')?.focus({ preventScroll: true });
}
function renderRank() {
  $('ranking-preview').innerHTML = ranks[activeRank].map((player, index) => `<div class="rank-line"><span class="rank-pos">${index + 1}</span><span class="rank-name">${escapeHtml(player[0])}<br /><small class="dim">${escapeHtml(player[1])}</small></span><span class="rank-points">${player[2]} vit.</span></div>`).join('');
  document.querySelectorAll('[data-rank]').forEach(button => {
    const active = button.dataset.rank === activeRank;
    button.classList.toggle('on', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
async function loadNews() {
  const element = $('news-cards');
  if (!element) return;
  if (!apiOnline) { element.innerHTML = emptyState('Comunicados em breve', 'O servidor do portal precisa estar conectado para carregar notícias publicadas pela equipe.'); return; }
  try {
    const data = await api('/news');
    if (!element.isConnected) return;
    element.innerHTML = data.articles?.length ? newsMarkup(data.articles.slice(0, currentPage === 'home' ? 3 : 20)) : emptyState('Nenhum comunicado publicado', 'As novidades oficiais do projeto aparecerão aqui quando a equipe publicar.');
  } catch { if (element.isConnected) element.innerHTML = emptyState('Notícias temporariamente indisponíveis', 'Não foi possível carregar as publicações. Tente atualizar a página.'); }
}
async function loadEvents() {
  const element = $('events-list');
  if (!element) return;
  if (!apiOnline) { element.innerHTML = emptyState('Agenda indisponível', 'Conecte o servidor web para consultar a agenda publicada pela equipe.'); return; }
  try {
    const data = await api('/events');
    if (!element.isConnected) return;
    element.innerHTML = data.events?.length ? data.events.map(event => {
      const when = new Date(event.starts_at);
      return `<article class="notice-row"><div class="tag">AGENDA DO PORTAL</div><h3>${escapeHtml(event.title)}</h3>${Number.isNaN(when.getTime()) ? '' : `<time datetime="${escapeHtml(event.starts_at)}">${escapeHtml(when.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }))}</time>`}<p>${escapeHtml(event.description)}</p></article>`;
    }).join('') : emptyState('Nenhum evento agendado', 'Não há datas oficiais anunciadas. As regras de premiação acima são o planejamento do projeto.');
  } catch { if (element.isConnected) element.innerHTML = emptyState('Agenda indisponível', 'Não foi possível consultar os eventos do portal.'); }
}
async function loadTeam() {
  const element = $('team-list');
  if (!element) return;
  if (!apiOnline) { element.innerHTML = emptyState('Equipe ainda não carregada', 'A listagem depende do servidor web. Não informamos presença online sem confirmação.'); return; }
  try {
    const data = await api('/team');
    if (!element.isConnected) return;
    element.innerHTML = data.members?.length ? `<ul class="feature-list">${data.members.map(member => `<li><b>${escapeHtml(member.username)}</b> <span class="role-badge">${escapeHtml(roles[member.role] || 'Equipe')}</span></li>`).join('')}</ul>` : emptyState('Equipe ainda não cadastrada', 'Os responsáveis aparecerão aqui após a configuração das contas da equipe.');
  } catch { if (element.isConnected) element.innerHTML = emptyState('Equipe indisponível', 'Não foi possível carregar a lista de membros da equipe.'); }
}
function renderSession() {
  $('login-form').hidden = Boolean(session);
  $('session-panel').hidden = !session;
  $('auth-hint').textContent = apiOnline ? 'Conta do portal · GameServer ainda não integrado.' : 'Conecte o servidor web para entrar ou criar uma conta.';
  if (session) $('session-panel').innerHTML = `<b>Olá, ${escapeHtml(session.username)}.</b><p>${escapeHtml(roles[session.role] || 'Jogador')} · Conta do portal</p><div class="session-actions"><a href="portal.html#conta" class="btn-gold">MINHA CONTA →</a>${isStaff(session) ? '<a href="staff.html" class="btn-outline">CENTRAL DA EQUIPE</a>' : ''}<button class="btn-outline" id="logout-button" type="button">SAIR DA CONTA</button></div>`;
  document.querySelectorAll('#login-form button, #registration-form button, #chat-form button').forEach(button => button.disabled = !apiOnline || (button.closest('#chat-form') && chatClosed));
}
async function initApi() {
  try {
    const health = await api('/health');
    if (!health.ok) throw new Error('Servidor indisponível');
    apiOnline = true;
    session = (await api('/auth/me')).user || null;
    $('chat-state').textContent = 'Fila de suporte · resposta conforme disponibilidade';
    renderSession();
    if (['home', 'noticias'].includes(currentPage)) loadNews();
    if (currentPage === 'eventos') loadEvents();
    if (currentPage === 'equipe') loadTeam();
    if (currentPage === 'cadastro') go();
    refreshChat();
  } catch {
    apiOnline = false;
    $('chat-state').textContent = 'Servidor de suporte indisponível';
    renderSession();
  }
}
async function submitAccount(event, kind) {
  event.preventDefault();
  if (!apiOnline) { notify('Este recurso precisa do servidor web conectado.'); return; }
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  const payload = kind === 'login' ? { email: $('login-email').value, password: $('login-password').value } : Object.fromEntries(new FormData(form));
  try {
    const data = await api(`/auth/${kind === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(payload) });
    session = data.user;
    form.reset();
    renderSession();
    if (kind !== 'login') location.hash = '#home';
    notify(kind === 'login' ? 'Você entrou na sua conta do portal.' : 'Conta do portal criada. Bem-vindo ao MU EC!');
  } catch (error) { notify(error.message); }
  finally { button.disabled = !apiOnline; }
}
function openChat(force) {
  const visible = force ?? $('chat-window').hidden;
  $('chat-window').hidden = !visible;
  $('chat-launch').setAttribute('aria-expanded', String(visible));
  if (visible) {
    $('chat-message').focus({ preventScroll: true });
    refreshChat();
  } else $('chat-launch').focus({ preventScroll: true });
}
function insertChat(messages) {
  const signature = JSON.stringify(messages);
  if (signature === lastTranscript) return;
  lastTranscript = signature;
  const container = $('chat-log');
  container.innerHTML = messages.map(message => `<div class="bubble ${message.sender === 'moderator' ? 'moderator' : 'user'}">${escapeHtml(message.body)}<small>${message.sender === 'moderator' ? `Equipe${message.by ? ' · ' + escapeHtml(message.by) : ''}` : 'Você'} · ${escapeHtml(new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))}</small></div>`).join('');
  container.scrollTop = container.scrollHeight;
}
async function refreshChat() {
  if ($('chat-window').hidden || !apiOnline || !chatId || !chatToken) return;
  try {
    const data = await api(`/chat/${encodeURIComponent(chatId)}?token=${encodeURIComponent(chatToken)}`);
    insertChat(data.messages);
    chatClosed = data.chat.status === 'closed';
    $('chat-state').textContent = chatClosed ? 'Conversa encerrada pela equipe' : data.messages.some(message => message.sender === 'moderator') ? 'Conversa com a equipe · respostas humanas' : 'Mensagem na fila · aguardando a equipe';
    $('new-chat').hidden = !chatClosed;
    $('chat-form').hidden = chatClosed;
  } catch (error) {
    $('chat-state').textContent = error.status === 404 ? 'Conversa anterior indisponível' : 'Não foi possível atualizar a conversa';
    if (error.status === 404) { chatClosed = true; $('new-chat').hidden = false; $('chat-form').hidden = true; }
  }
}
async function sendChat(event) {
  event.preventDefault();
  if (!apiOnline) { notify('O chat precisa do servidor web conectado.'); return; }
  if (chatClosed) return;
  const message = $('chat-message').value.trim();
  const name = $('chat-name').value.trim() || session?.username || 'Visitante';
  if (!message) return;
  const button = $('chat-form').querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  try {
    if (!chatId) {
      const data = await api('/chat/start', { method: 'POST', body: JSON.stringify({ name, message }) });
      chatId = data.chat_id; chatToken = data.token;
      storage.set('mu_chat_id', chatId); storage.set('mu_chat_token', chatToken);
    } else await api('/chat/message', { method: 'POST', body: JSON.stringify({ chat_id: chatId, token: chatToken, message }) });
    $('chat-message').value = '';
    await refreshChat();
    notify('Mensagem enviada. A equipe responderá quando estiver disponível.');
  } catch (error) { notify(error.message); }
  finally { button.disabled = !apiOnline || chatClosed; }
}
document.addEventListener('click', async event => {
  if (event.target.closest('#chat-launch')) openChat();
  if (event.target.closest('#open-chat-inline')) openChat(true);
  if (event.target.closest('#chat-close')) openChat(false);
  const rank = event.target.closest('[data-rank], [data-full-rank]');
  if (rank) {
    activeRank = rank.dataset.rank || rank.dataset.fullRank;
    renderRank();
    if (currentPage === 'ranking') { go(); document.querySelector(`[data-full-rank="${activeRank}"]`)?.focus({ preventScroll: true }); }
  }
  if (event.target.closest('#logout-button')) {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }); session = null; renderSession(); notify('Você saiu da conta.'); }
    catch (error) { notify(error.message); }
  }
  if (event.target.closest('#new-chat')) {
    chatId = null; chatToken = null; chatClosed = false; lastTranscript = '';
    storage.remove('mu_chat_id'); storage.remove('mu_chat_token');
    $('chat-log').innerHTML = '<p class="chat-notice">Escreva sua dúvida para iniciar uma nova conversa. A equipe responderá quando estiver disponível.</p>';
    $('chat-form').hidden = false; $('new-chat').hidden = true;
    $('chat-form').querySelector('button').disabled = !apiOnline;
    $('chat-state').textContent = 'Nova conversa · suporte humano';
    $('chat-message').focus();
  }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'login-form') submitAccount(event, 'login');
  if (event.target.id === 'registration-form') submitAccount(event, 'register');
  if (event.target.id === 'chat-form') sendChat(event);
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('chat-window').hidden) openChat(false); });
window.addEventListener('hashchange', go);
go(); renderRank(); renderSession(); initApi();
setInterval(() => { if (!$('chat-window').hidden && !document.hidden) refreshChat(); }, 4000);
