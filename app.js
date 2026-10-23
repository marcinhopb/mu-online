/* MU EC — conta local do site e demonstrações independentes do GameServer. */
'use strict';

const KEY = 'mu-ec-demo-v2';
const pages = {
  inicio: 'Visão geral', conta: 'Detalhes da conta', jogo: 'Jogo',
  personagens: 'Personagens', baus: 'Baús', seguranca: 'Segurança',
  editor: 'Editor de itens', ranking: 'Ranking PvP', premios: 'Premiações',
  mercado: 'TradePay', carteira: 'Carteira', admin: 'Central da equipe', regras: 'Regras do MU EC'
};
const demoPages = new Set(['editor', 'ranking', 'premios', 'mercado', 'carteira']);
const classes = ['BK', 'SM', 'ME', 'MG', 'DL'];
const setRotation = ['Crimson', 'Obsidian', 'Celestial', 'Sovereign', 'Phantom'];
const parts = ['Capacete', 'Armadura', 'Calça', 'Luvas', 'Botas'];
const power = {11:100, 12:102, 13:105, 14:108, 15:111};
const excellentOptions = {
  weapon: [['damage','Dano adicional'], ['critical','Chance excelente'], ['speed','Velocidade de ataque'], ['mana','Mana por eliminação']],
  armor: [['reduction','Redução de dano'], ['reflect','Reflexão de dano'], ['life','Vida adicional'], ['defense','Taxa de defesa']],
  wings: [['life','Vida adicional'], ['recovery','Recuperação'], ['defense','Defesa adicional']],
  accessory: [['life','Vida adicional'], ['reduction','Redução de dano'], ['reflect','Reflexão de dano']]
};
const optionLabels = Object.fromEntries(Object.values(excellentOptions).flat());
const itemRules = {
  weapon: {luck:true, skill:true, additional:[0,4,8,12,16]},
  armor: {luck:true, skill:false, additional:[0,4,8,12,16]},
  wings: {luck:true, skill:false, additional:[0,4,8,12,16]},
  accessory: {luck:false, skill:false, additional:[0,1,2,3]}
};
const starterItems = [
  {id:'i1',name:'Espada do Crepúsculo',icon:'⚔',type:'weapon',level:11,luck:true,skill:true,additional:12,excellent:['critical','damage'],premium:false},
  {id:'i2',name:'Armadura de Obsidiana',icon:'♜',type:'armor',level:9,luck:true,skill:false,additional:8,excellent:['reduction','life'],premium:false},
  {id:'i3',name:'Botas do Guardião',icon:'♧',type:'armor',level:7,luck:false,skill:false,additional:4,excellent:['reflect'],premium:false},
  {id:'i4',name:'Asas do Eclipse',icon:'✦',type:'wings',level:11,luck:true,skill:false,additional:8,excellent:['life'],premium:false},
  {id:'i5',name:'Anel do Titã',icon:'◈',type:'accessory',level:10,luck:false,skill:false,additional:3,excellent:['life'],premium:false},
  {id:'i6',name:'Cetro Soberano — Troféu',icon:'♛',type:'weapon',level:15,luck:true,skill:true,additional:16,excellent:['damage','critical'],premium:true}
];
const starterMarket = [
  {id:'m1',seller:'DarkLordX',item:'Armadura Crimson +13',icon:'♜',price:95,status:'listed'},
  {id:'m2',seller:'NightElf',item:'Luvas Phantom +13',icon:'✦',price:72,status:'listed'},
  {id:'m3',seller:'WarChief',item:'Espada Imperial +15',icon:'⚔',price:205,status:'listed'}
];
const defaultState = () => ({items:structuredClone(starterItems),market:structuredClone(starterMarket),selected:'i1',rankPeriod:'week',classFilter:'ALL',draw:null,simulations:[],wallet:{available:425,pending:0},lastSaved:null});

// Only demonstration data belongs in localStorage. Authentication stays in the HttpOnly cookie.
function normalizeItem(template, candidate = {}) {
  if (template.premium) return structuredClone(template);
  const rules = itemRules[template.type];
  const allowed = excellentOptions[template.type].map(([key]) => key);
  return {...template,
    level: Number.isFinite(candidate.level) ? Math.max(0, Math.min(11, Math.trunc(candidate.level))) : template.level,
    luck: rules.luck && (typeof candidate.luck === 'boolean' ? candidate.luck : template.luck),
    skill: rules.skill && (typeof candidate.skill === 'boolean' ? candidate.skill : template.skill),
    additional: rules.additional.includes(candidate.additional) ? candidate.additional : template.additional,
    excellent: Array.isArray(candidate.excellent) ? [...new Set(candidate.excellent.filter(key => allowed.includes(key)))] : [...template.excellent]
  };
}
function restoreState() {
  const fresh = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || !Array.isArray(saved.items)) return fresh;
    fresh.items = starterItems.map(item => normalizeItem(item, saved.items.find(i => i?.id === item.id)));
    if (fresh.items.some(i => i.id === saved.selected)) fresh.selected = saved.selected;
    if (['day','week','month'].includes(saved.rankPeriod)) fresh.rankPeriod = saved.rankPeriod;
    if (['ALL',...classes].includes(saved.classFilter)) fresh.classFilter = saved.classFilter;
    if (Array.isArray(saved.draw) && saved.draw.length === 2 && new Set(saved.draw).size === 2 && saved.draw.every(n => Number.isInteger(n) && n >= 0 && n < 5)) fresh.draw = saved.draw;
    if (Array.isArray(saved.market)) fresh.market = saved.market.slice(0, 30).filter(m => m && typeof m.id === 'string' && /^[a-z0-9-]{1,60}$/i.test(m.id) && typeof m.seller === 'string' && typeof m.item === 'string' && Number.isFinite(m.price) && m.price >= 1 && m.price <= 100000 && ['listed','reserved','paid','delivered','settled'].includes(m.status)).map(m => ({id:m.id, seller:m.seller.slice(0,30), item:m.item.slice(0,100), icon:'◇', price:m.price, status:m.status}));
    if (Array.isArray(saved.simulations)) fresh.simulations = saved.simulations.slice(-30).filter(s => s && typeof s.description === 'string' && typeof s.date === 'string').map(s => ({description:s.description.slice(0,200),date:s.date.slice(0,60)}));
    return fresh;
  } catch { return fresh; }
}
let state = restoreState();
let identity = {loading:true, available:false, user:null};
let revealEmail = false;
let showCharacterDemo = false;
let editorDraft = null;
const $ = selector => document.querySelector(selector);
const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = n => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(n);
const formatDate = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Sao_Paulo'}).format(date) : 'Não disponível';
};
const pill = (text, style = 'dim') => `<span class="pill ${style}">${safe(text)}</span>`;
const roles = {player:'Jogador',moderator:'Moderador',gm:'Game Master',admin:'Administrador'};
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch { notice('O navegador não permitiu salvar a demonstração. As mudanças valem só nesta visita.'); return false; }
}
function notice(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => el.classList.remove('show'), 4500);
}
function header(eyebrow, title, lead) {
  return `<div class="eyebrow">${safe(eyebrow)}</div><h1 class="page-title" tabindex="-1">${safe(title)}</h1><p class="lead">${safe(lead)}</p>`;
}
function sessionNotice() {
  if (identity.loading) return '<div class="session-notice"><div><strong>Consultando sua sessão…</strong><p>As demonstrações podem ser exploradas enquanto a conta é verificada.</p></div></div>';
  if (identity.user) return '';
  return `<div class="session-notice"><div><strong>${identity.available?'Você está explorando como visitante.':'O serviço de contas está indisponível.'}</strong><p>${identity.available?'Entre para consultar os dados da sua conta do site. As demonstrações não dependem de login.':'As demonstrações continuam disponíveis. Não envie dados de acesso até a conexão voltar.'}</p></div><a class="btn ghost" href="index.html#login">${identity.available?'Entrar na conta':'Voltar ao site'}</a></div>`;
}
function demoBanner() {
  return `<div class="demo-banner">${pill('DEMONSTRAÇÃO')}<span>Dados de exemplo neste navegador. Nenhum item, vitória ou dinheiro real é movimentado.</span></div>`;
}
function emptyState(symbol, title, message, action = '') {
  return `<div class="card empty"><div class="symbol" aria-hidden="true">${symbol}</div><h2>${safe(title)}</h2><p>${safe(message)}</p>${action?`<div class="actions">${action}</div>`:''}</div>`;
}
function getItem() { return state.items.find(i => i.id === state.selected) || state.items[0]; }
function itemTile(it, extra = '') {
  return `<div class="item-row"><span class="item-icon ${it.premium?'premium':''}" aria-hidden="true">${safe(it.icon)}</span><div class="item-main"><b>${safe(it.name)} +${it.level}</b><small>${it.luck?'Luck · ':''}${it.skill?'Skill · ':''}Additional +${it.additional} · ${it.excellent.length} Excellent</small></div><div class="item-right">${it.premium?pill('EVENTO / DONATE','danger'):pill('EDITÁVEL NA DEMO','good')}${extra}</div></div>`;
}
function renderInicio() {
  return `${sessionNotice()}<section class="hero"><span class="eyebrow">MU EC · MU 100% EDITÁVEL</span><h1>Seu equipamento.<br>Sua estratégia.<br><em>Sua vitória.</em></h1><p>Prepare sua próxima conquista. O espírito do PvP clássico, cinco classes e uma comunidade construída em torno da competição.</p><div class="actions"><button class="btn" data-go="conta">Minha conta →</button><button class="btn ghost" data-go="editor">Explorar editor DEMO</button></div></section>
  <div class="grid cols-4">${[
    ['CONTA DO SITE',identity.user?'Conectada':identity.available?'Visitante':'Offline',identity.user?safe(identity.user.username):'Cadastro e login locais'],
    ['GAMESERVER','Em preparo','BK · SM · ME · MG · DL'],
    ['EDITOR COMUM','+0 → +11','Demonstração disponível'],
    ['PAGAMENTOS','Desativados','Sem Pix, Donate ou saques']
  ].map(([label,value,desc])=>`<div class="card metric"><div class="tag">${label}</div><div class="value">${value}</div><div class="desc">${desc}</div></div>`).join('')}</div>
  <div class="section-head"><h2>Seu espaço no MU EC</h2><small>Conta do site e recursos de jogo têm estados separados</small></div><div class="grid cols-3">
  ${[['◈','Detalhes da conta','Consulte a identidade vinculada à sua sessão do site.','conta','Ver minha conta'],['⚒','Monte sua estratégia','Experimente o editor até +11, sem alterar nenhum inventário real.','editor','Explorar demonstração'],['♛','A conquista tem valor','Conheça as regras dos rankings diário, semanal e mensal.','premios','Conhecer as premiações']].map(([icon,title,desc,page,button])=>`<div class="card"><span class="reward-circle" aria-hidden="true">${icon}</span><h3>${title}</h3><p class="small muted">${desc}</p><button class="btn ghost" data-go="${page}">${button}</button></div>`).join('')}</div>
  <div class="note">O jogo ainda está em preparação. Personagens, inventário, rankings e TradePay são demonstrações; a conta do site e o atendimento funcionam quando o serviço web está disponível.</div>`;
}
function renderConta() {
  const user = identity.user;
  const head = header('ÁREA DO JOGADOR','Detalhes da conta','Sua identidade no site MU EC. Somente os dados da sessão autenticada são exibidos aqui.');
  if (!user) return `${head}${sessionNotice()}${emptyState('◈','Entre para consultar sua conta','Nenhum dado pessoal de demonstração é apresentado como se fosse seu.', '<a class="btn" href="index.html#login">Entrar no site →</a><a class="btn ghost" href="index.html#cadastro">Criar conta</a>')}`;
  const email = String(user.email || '');
  const at = email.indexOf('@');
  const protectedEmail = at > 0 ? email[0] + '•••' + email.slice(at) : 'Não disponível';
  const field = (label, value, missing = false) => `<div><dt>${safe(label)}</dt><dd${missing?' class="unavailable"':''}>${value}</dd></div>`;
  return `${head}<div class="grid cols-2"><section class="card"><div class="profile-summary"><span class="profile-avatar" aria-hidden="true">${safe(user.username?.slice(0,2).toUpperCase())}</span><div><h2>${safe(user.username)}</h2><p>Conta do site MU EC</p>${pill(roles[user.role] || 'Jogador','good')}</div></div><dl class="account-fields">
  ${field('LOGIN',safe(user.username))}${field('CADASTRO',safe(formatDate(user.created_at)))}
  ${field('E-MAIL',safe(revealEmail?email:protectedEmail)+(email?`<button class="text-button" data-action="reveal-email" aria-pressed="${revealEmail}">${revealEmail?'Ocultar':'Mostrar'}</button>`:''))}
  ${field('NOME COMPLETO','Não solicitado no cadastro',true)}${field('NASCIMENTO','Não solicitado no cadastro',true)}${field('PAÍS / TELEFONE','Não solicitados no cadastro',true)}</dl><p class="small muted" style="margin-top:18px">A edição de dados cadastrais ainda está em preparação.</p></section>
  <section class="card"><h2>Uma conta, uma identidade</h2><p class="small muted">Seu cadastro identifica você no site e no atendimento. O vínculo com personagens e inventários depende da integração futura com o servidor de jogo.</p>
  <div class="service-row"><span class="service-symbol" aria-hidden="true">◈</span><div><b>Sessão do site</b><p>Identidade autenticada neste navegador.</p></div>${pill('CONECTADA','good')}</div>
  <div class="service-row"><span class="service-symbol" aria-hidden="true">⚔</span><div><b>Conta de jogo</b><p>GameServer ainda não conectado.</p></div>${pill('EM PREPARAÇÃO')}</div>
  <div class="actions" style="margin-top:22px"><button class="btn ghost" data-go="seguranca">Segurança da conta</button><button class="text-button" data-action="refresh-session">Atualizar sessão ↻</button></div></section></div>`;
}
function renderJogo() {
  return `${header('ÁREA DO JOGADOR','Jogo','Acompanhe o estado da integração. Conectar sua conta ao site ainda não cria uma conta no servidor de jogo.')}${sessionNotice()}
  <div class="grid cols-3">${[['STATUS DO JOGO','Não conectado','O GameServer está em preparação.'],['ÚLTIMA CONEXÃO','—','Nenhuma conexão de jogo disponível.'],['SERVIDOR','—','Nenhum servidor público foi anunciado.']].map(([t,v,d])=>`<div class="card metric"><div class="tag">${t}</div><div class="value">${v}</div><div class="desc">${d}</div></div>`).join('')}</div>
  <div class="section-head"><h2>Moedas do jogo</h2><small>Saldos aguardam integração</small></div><div class="grid cols-3">${['Golds','Gold','JC Point'].map(name=>`<div class="card"><h3>${name}</h3><div class="stat-big">—</div><p class="small muted" style="margin-top:12px">Nenhum saldo de jogo disponível.</p></div>`).join('')}</div>
  <div class="section-head"><h2>Conversões e ferramentas</h2></div><div class="card"><p class="small muted">Conversões de moedas, resets e ferramentas de personagem dependem de regras confirmadas e da conexão segura com o GameServer.</p><div class="actions"><button class="btn secondary" disabled>Conversão indisponível</button><button class="btn ghost" data-go="personagens">Ver personagens</button></div></div>`;
}
const characterSamples = [
  ['BK','Blade Knight','Guerreiro EC','Força'], ['SM','Soul Master','Mago EC','Energia'],
  ['ME','Muse Elf','Elfa EC','Agilidade'], ['MG','Magic Gladiator','Gladiador EC','Força / Energia'], ['DL','Dark Lord','Soberano EC','Command']
];
function renderPersonagens() {
  const examples = showCharacterDemo ? `<div class="section-head"><h2>Personagens de exemplo</h2><small>Não pertencem à sua conta</small></div><div class="character-list">${characterSamples.map(([abbr,name,nick,attribute])=>`<details class="character"><summary><span class="class-avatar ${abbr.toLowerCase()}" aria-hidden="true">${abbr}</span><span><b>${nick}</b><small>${name} · personagem fictício</small></span>${pill('DEMO')}</summary><div class="character-body"><div class="character-stats"><div><span>CLASSE</span><b>${abbr}</b></div><div><span>NÍVEL DE EXEMPLO</span><b>400</b></div><div><span>RESETS DE EXEMPLO</span><b>0</b></div><div><span>ATRIBUTO EM DESTAQUE</span><b>${attribute}</b></div></div><p class="small muted">${abbr==='DL'?'A base futura precisa oferecer Dark Lord com atributo Command funcional.':'Build e equipamentos reais serão validados pelo servidor de jogo.'}</p><button class="btn ghost" data-go="editor">Ver inventário de exemplo →</button></div></details>`).join('')}</div>` : '';
  return `${header('ÁREA DO JOGADOR','Personagens','Aqui serão listados os personagens vinculados à sua conta de jogo, quando houver integração.')}${sessionNotice()}${emptyState('♜','Seus personagens ainda não estão conectados','O MU EC não está conectado a um GameServer. Nenhum personagem é criado ou vinculado por esta demonstração.',`<button class="btn ghost" data-action="character-demo" aria-expanded="${showCharacterDemo}">${showCharacterDemo?'Ocultar':'Explorar'} personagens de exemplo</button>`)}${examples}`;
}
function renderBaus() {
  return `${header('SEU EQUIPAMENTO','Baús','Inventário e baús só poderão ser consultados após a integração segura com o servidor de jogo.')}${sessionNotice()}<div class="grid cols-2"><div class="card"><div class="flex space-between"><h2>Seu baú</h2>${pill('AGUARDA INTEGRAÇÃO')}</div><div class="vault-grid" aria-hidden="true">${'<span></span>'.repeat(32)}</div><p class="small muted center">Ilustração de espaço do baú. Nenhum slot real foi consultado.</p></div><div class="card"><h2>Controle dos baús</h2><dl class="account-fields"><div><dt>QUANTIDADE</dt><dd>Não disponível</dd></div><div><dt>STATUS DA TRAVA</dt><dd>Não disponível</dd></div></dl><p class="small muted" style="margin-top:22px">Compra de baús, trava e recuperação de senha só serão habilitadas com autorização e validação no servidor.</p><div class="actions"><button class="btn secondary" disabled>Comprar baú — indisponível</button><button class="btn secondary" disabled>Recuperação indisponível</button></div><div class="note">Nunca envie sua senha ou PIN de segurança pelo chat de suporte.</div></div></div>`;
}
function renderSeguranca() {
  return `${header('PROTEJA SUA CONTA','Segurança','Confira os recursos disponíveis. Senhas e PINs não são exibidos no painel.')}${sessionNotice()}<div class="grid cols-2"><div class="card"><h2>Proteção de acesso</h2>
  <div class="service-row"><span class="service-symbol" aria-hidden="true">⛨</span><div><b>Sessão do site</b><p>${identity.user?'Você está autenticado neste navegador.':'Entre no site para consultar sua identidade.'}</p></div>${pill(identity.user?'CONECTADA':'SEM SESSÃO',identity.user?'good':'dim')}</div>
  <div class="service-row"><span class="service-symbol" aria-hidden="true">◈</span><div><b>Senha da conta</b><p>Sua senha não é exibida nem armazenada pelo painel.</p></div>${pill('PRIVADA','good')}</div>
  <div class="service-row"><span class="service-symbol" aria-hidden="true">✦</span><div><b>PIN / PID secundário</b><p>Será integrado a um fluxo protegido de criação e recuperação.</p></div>${pill('EM PREPARAÇÃO')}</div>
  ${identity.user?'<button class="btn ghost" data-action="logout" style="margin-top:20px">Encerrar esta sessão</button>':'<a class="btn ghost" href="index.html#login" style="margin-top:20px">Entrar na conta</a>'}</div>
  <div class="card"><h2>Cuide da sua conta</h2><ul class="features"><li>Use uma senha longa e exclusiva para o MU EC.</li><li>A equipe nunca precisa conhecer sua senha ou PIN.</li><li>Ao usar um computador compartilhado, encerre sua sessão.</li><li>Não envie documentos ou informações financeiras no atendimento do protótipo.</li></ul><div class="note warning">Troca e recuperação de senha e autenticação em dois fatores ainda estão em preparação. Não há formulário ativo para PIN nesta versão.</div><a class="btn ghost" href="index.html#suporte">Central de ajuda →</a></div></div>`;
}
function itemPreview(it) {
  return `<div class="eyebrow">PRÉVIA DE EXEMPLO</div><div class="preview-symbol" aria-hidden="true">${safe(it.icon)}</div><h3>${safe(it.name)} +${it.level}</h3>${it.premium?pill('ITEM ESPECIAL BLOQUEADO','danger'):pill('SEM TRANSPARÊNCIA · +0 A +11','good')}<hr class="separator"><p class="small">${it.luck?'✔ Luck':'— Sem Luck'} · ${it.skill?'✔ Skill':'— Sem Skill'} · Additional +${it.additional}</p>${it.excellent.map(key=>`<p class="small muted">✦ ${safe(optionLabels[key])}</p>`).join('')||'<p class="muted small">Sem opções Excellent</p>'}<div class="note">As opções deste catálogo são ilustrativas. As restrições definitivas serão determinadas por modelo e validadas no backend e no GameServer.</div><p class="tiny">O efeito transparente de +12 a +15 depende do cliente de jogo. A prévia web não modifica a aparência de um equipamento real.</p>`;
}
function renderEditor() {
  const selected = getItem();
  if (!editorDraft || editorDraft.id !== selected.id) editorDraft = structuredClone(selected);
  const it = editorDraft, rules = itemRules[it.type];
  return `${header('SEU EQUIPAMENTO','Editor de itens','Experimente combinações de +0 a +11 em itens de exemplo. O editor não concede nem altera itens reais.')}
  <div class="grid cols-2"><div class="card"><h2>Inventário de exemplo</h2><label class="form-label" for="item-select">Escolha o equipamento</label><select id="item-select" class="field">${state.items.map(i=>`<option value="${i.id}" ${i.id===it.id?'selected':''}>${safe(i.name)} +${i.level}${i.premium?' · ESPECIAL BLOQUEADO':''}</option>`).join('')}</select>
  <hr class="separator">${it.premium?'<div class="note warning"><b>Equipamento especial bloqueado</b><br>+12 a +15 são exclusivos de eventos oficiais ou Donate. Nível e opções não podem ser alterados pelo editor comum.</div>':`<label class="form-label" for="level-slider">Nível do equipamento</label><div class="flex space-between"><span>+0</span><output class="stat-big" id="level-display" for="level-slider">+${it.level}</output><span>+11</span></div><input id="level-slider" class="range" type="range" min="0" max="11" step="1" value="${it.level}"><div class="grid cols-2" style="margin-top:12px"><label class="choice ${!rules.luck?'disabled':''}"><input type="checkbox" data-opt="luck" ${it.luck?'checked':''} ${!rules.luck?'disabled':''}> Luck${!rules.luck?' · incompatível':''}</label><label class="choice ${!rules.skill?'disabled':''}"><input type="checkbox" data-opt="skill" ${it.skill?'checked':''} ${!rules.skill?'disabled':''}> Skill${!rules.skill?' · só armas':''}</label></div><label class="form-label" for="additional-select">Additional${it.type==='accessory'?' · recuperação (%)':''}</label><select class="field" id="additional-select">${rules.additional.map(value=>`<option value="${value}" ${it.additional===value?'selected':''}>+${value}${it.type==='accessory'?'%':''}</option>`).join('')}</select><h3 style="margin:21px 0 10px">Opções Excellent compatíveis</h3>${excellentOptions[it.type].map(([key,label])=>`<label class="choice"><input type="checkbox" data-excellent="${key}" ${it.excellent.includes(key)?'checked':''}> ${label}</label>`).join('')}<p class="tiny" id="editor-status">Ajuste as opções e salve para manter a demonstração neste navegador.</p><button class="btn" data-action="save-item" style="width:100%;margin-top:6px">Salvar alterações na demonstração</button>`}</div>
  <aside class="preview-panel ${it.premium?'premium':''}">${itemPreview(it)}</aside></div>`;
}
const rankingRows={day:[['WarChief','BK',3],['DarkLordX','DL',2],['NightElf','ME',2],['ArcMage','SM',1],['MagicMG','MG',1]],week:[['DarkLordX','DL',18],['WarChief','BK',16],['ArcMage','SM',14],['MagicMG','MG',11],['NightElf','ME',9]],month:[['WarChief','BK',62],['DarkLordX','DL',58],['NightElf','ME',52],['ArcMage','SM',49],['MagicMG','MG',46]]};
function renderRanking(){let filtered=rankingRows[state.rankPeriod].filter(x=>state.classFilter==='ALL'||x[1]===state.classFilter);return `${header('COMPETIÇÃO','Ranking de eventos PvP','Vitórias computadas somente a partir de eventos oficiais no servidor futuro; aqui todos os dados são fictícios.')}
<div class="grid cols-3"><div class="card highlight"><span class="eyebrow">DIÁRIO</span><div class="stat-big" style="margin:12px 0">Golds</div><p class="muted small">Recompensa menor e destaque para o campeão diário.</p></div><div class="card highlight"><span class="eyebrow">SEMANAL</span><div class="stat-big" style="margin:12px 0">2 peças +13</div><p class="muted small">Duas partes aleatórias e distintas do set em destaque.</p></div><div class="card highlight"><span class="eyebrow">MENSAL</span><div class="stat-big" style="margin:12px 0">Arma +15</div><p class="muted small">Full Excellent para a classe escolhida pelo campeão.</p></div></div>
<div class="section-head"><h2>Classificação demonstrativa</h2><small>Esta tabela não recebe dados de jogadores reais</small></div>
<div class="card"><div class="flex space-between" style="margin-bottom:18px"><div class="tabbar">${[['day','Hoje'],['week','Semana'],['month','Mês']].map(([id,name])=>`<button class="tab ${state.rankPeriod===id?'active':''}" data-rank="${id}">${name}</button>`).join('')}</div><select class="field" id="class-filter" style="width:145px"><option value="ALL">Todas as classes</option>${classes.map(c=>`<option value="${c}" ${c===state.classFilter?'selected':''}>${c}</option>`).join('')}</select></div><div class="table-wrap"><table><thead><tr><th>POSIÇÃO</th><th>PERSONAGEM</th><th>CLASSE</th><th>VITÓRIAS</th></tr></thead><tbody>${filtered.map((r,i)=>`<tr><td class="${i===0?'rank-1':''}">${i===0?'♛ ':''}${i+1}º</td><td><b>${r[0]}</b></td><td>${pill(r[1])}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></div><div class="note">O ranking PvP principal aceitará itens até +15, mas será balanceado para que conjuntos +11 otimizados tenham chances reais de vencer equipamentos superiores incompletos. Torneios de limite +11 poderão existir à parte.</div>`;}
function weekSet(){const start=new Date(Date.UTC(new Date().getUTCFullYear(),0,1));const week=Math.floor((Date.now()-start.getTime())/(7*86400000));return setRotation[Math.abs(week)%5];}
function renderPremios(){let set=weekSet();return `${header('EVENTOS OFICIAIS','Premiações e temporadas','A recompensa precisa ter prestígio, raridade e valor de troca sem transformar o jogador com +15 em invencível.')}
<div class="grid cols-3"><div class="card"><div class="reward-circle">⚔</div><h3>Ranking diário</h3><p class="muted small">Golds e troféus demonstrativos para o jogador com mais vitórias oficiais.</p></div><div class="card highlight"><div class="reward-circle">♛</div><h3>Ranking semanal</h3><p class="muted small">2 peças distintas, sorteadas aleatoriamente, do set especial +13 da semana.</p></div><div class="card"><div class="reward-circle">✦</div><h3>Ranking mensal</h3><p class="muted small">Arma Full Excellent +15 compatível com a classe do campeão.</p></div></div>
<div class="section-head"><h2>Simulação do set +13: ${set}</h2><small>Catálogo ilustrativo · sujeito a confirmação</small></div><div class="card"><div class="set-slots">${parts.map((p,i)=>`<div class="slot ${state.draw&&state.draw.includes(i)?'won':''}"><div class="slot-symbol">${['♜','♛','▥','✦','♧'][i]}</div><small>${p}</small>${state.draw&&state.draw.includes(i)?pill('SORTEADO','good'):''}</div>`).join('')}</div><div style="margin:18px 0" class="flex space-between"><div><b>${state.draw?'Resultado simulado: '+state.draw.map(i=>parts[i]).join(' e '):'Sorteio de 2 partes distintas'}</b><div class="muted small">Somente demonstração local; não gera premiações reais.</div></div><button class="btn" data-action="draw">Simular sorteio</button></div><p class="tiny mb0">Nomes de exemplo, ainda não confirmados: ${setRotation.join(' → ')}. Evento PvP especial semanal: mais 1 peça +13, com regras de distribuição registradas.</p></div>
<div class="section-head"><h2>Arma mensal por classe</h2></div><div class="grid cols-3">${[['BK','Espada'],['SM','Cajado'],['ME','Arco'],['MG','Espada ou Cajado'],['DL','Cetro']].map(([cl,weapon])=>`<div class="card"><h3>${cl}</h3><p class="muted small">${weapon} Full +15 · Raridade de evento</p>${pill('TRANSPARENTE','danger')}</div>`).join('')}</div>`;}
function renderMercado(){const ordered=state.market.slice().reverse();return `${header('MERCADO ENTRE JOGADORES','TradePay — demonstração','Simulação de anúncio, reserva, pagamento, entrega e repasse de itens. NÃO há QR Code Pix real, saldos financeiros nem transferência de equipamento.')}
<div class="note warning"><b>Importante:</b> clicar em “Simular pagamento” não movimenta dinheiro. Uma versão operacional depende de GameServer, trava real do inventário, auditoria e um provedor financeiro habilitado.</div>
<div class="grid cols-2"><div class="card"><h3>Simular anúncio do jogador</h3><p class="muted small">Criar um anúncio ilustrativo, sem retirar o item de inventários reais.</p><label class="form-label" for="sale-item">Item</label><select class="field" id="sale-item">${state.items.map(it=>`<option value="${it.id}">${safe(it.name)} +${it.level}</option>`).join('')}</select><label class="form-label" for="sale-price">Preço demonstrativo em R$</label><input class="field" id="sale-price" type="number" min="1" max="100000" step="0.01" value="75"/><button class="btn" data-action="list-sale" style="margin-top:14px">Simular anúncio</button></div><div class="card"><h3>Fluxo da negociação</h3><div class="status-flow">${['Item listado','Item reservado','Pagamento simulado','Entrega simulada','Liquidação simulada'].map(s=>`<span class="flow-step">${s}</span>`).join('')}</div><hr class="separator"/><p class="small muted">No servidor real, cada etapa precisará confirmar a identidade, serial único, titularidade, disponibilidade do item e idempotência do pagamento.</p>${pill('PAGAMENTOS REAIS DESATIVADOS','danger')}</div></div>
<div class="section-head"><h2>Itens anunciados</h2><small>${ordered.length} anúncios de teste</small></div><div class="grid cols-2">${ordered.map(it=>`<div class="card"><div class="flex" style="margin-bottom:14px"><span class="item-icon">${it.icon}</span><div><b>${safe(it.item)}</b><div class="small muted">Vendedor: ${safe(it.seller)}</div></div></div><div class="flex space-between"><span class="stat-big" style="font-size:24px">${money(it.price)}</span>${pill(statusLabels[it.status]||it.status,it.status==='settled'?'good':'dim')}</div><hr class="separator"/><div class="flex space-between"><small class="muted">Compra simulada</small>${it.status==='listed'?`<button class="btn secondary" data-market="${it.id}">Reservar item (DEMO)</button>`:it.status==='reserved'?`<button class="btn secondary" data-market="${it.id}">Simular pagamento</button>`:it.status==='paid'?`<button class="btn secondary" data-market="${it.id}">Simular entrega</button>`:it.status==='delivered'?`<button class="btn secondary" data-market="${it.id}">Simular repasse</button>`:pill('Fluxo concluído','good')}</div></div>`).join('')}</div>`;}
const statusLabels={listed:'Anunciado',reserved:'Item reservado',paid:'Pagamento simulado',delivered:'Entrega simulada',settled:'Repasse simulado'};
function renderCarteira(){const total=state.wallet.available;return `${header('FINANCEIRO','Minha carteira','Valores fictícios para demonstrar a experiência. Depósitos, saques e recebimentos reais NÃO estão disponíveis.')}
<div class="grid cols-3"><div class="card highlight"><div class="eyebrow">SALDO SIMULADO</div><div class="stat-big" style="margin:12px 0">${money(total)}</div><small class="muted">Sem valor financeiro ou resgate</small></div><div class="card"><h3>Em processamento</h3><div class="stat-big" style="font-size:28px">${money(state.wallet.pending)}</div><p class="muted small mb0">Apenas demonstração</p></div><div class="card"><h3>Movimentações</h3><div class="stat-big" style="font-size:28px">${state.simulations.length}</div><p class="muted small mb0">Operações de teste</p></div></div><div class="section-head"><h2>Operações financeiras</h2></div><div class="card"><div class="actions"><button class="btn" disabled>Depositar Pix — indisponível</button><button class="btn secondary" disabled>Sacar — indisponível</button></div><div class="note warning">Não há instituição de pagamento integrada. O saldo fictício não pode ser sacado, transferido ou usado para pagar por itens reais.</div></div><div class="section-head"><h2>Histórico de simulações</h2></div><div class="card">${state.simulations.length?state.simulations.slice().reverse().map(s=>`<div class="item-row"><span class="item-icon">◇</span><div class="item-main"><b>${safe(s.description)}</b><small>${safe(s.date)} · DEMO</small></div></div>`).join(''):'<div class="empty"><div class="symbol">▣</div>Nenhuma negociação simulada por enquanto.</div>'}</div>`;}

function renderAdmin() {
  const staff = ['admin','gm','moderator'].includes(identity.user?.role);
  return `${header('EQUIPE MU EC','Central da equipe','O atendimento e a gestão do site ficam em um painel separado, com autenticação e permissões no servidor.')}${sessionNotice()}${emptyState('⛨',staff?'Sua central de trabalho':'Área reservada à equipe',staff?'Acesse as conversas e ferramentas liberadas para sua função.':'As ferramentas administrativas exigem uma conta autorizada. Este painel de demonstração não concede privilégios.',`<a class="btn" href="staff.html">${staff?'Abrir central da equipe':'Ver acesso à equipe'} →</a>`)} `;
}
function renderRegras() {
  return `${header('MU 100% EDITÁVEL','Regras do MU EC','Decisões do projeto para um PvP competitivo. Balanceamento e integrações ainda precisam de validação no jogo.')}
  <div class="grid cols-2"><div class="card"><h2>Seu equipamento, sua estratégia</h2><ul class="features"><li>Cinco classes: BK, SM, ME, MG e DL com Command.</li><li>Todos os modelos elegíveis podem ser editados de +0 até +11, com opções compatíveis com cada item.</li><li>+12, +13, +14 e +15 somente por eventos oficiais ou Donate. Donate permanece desativado.</li><li>+0 a +11 sem transparência; +12 a +15 com efeito transparente no cliente de jogo.</li><li>Uma build ALL +11 completa e estratégica precisa ter chance real contra equipamentos superiores incompletos.</li><li>ALL +15 deve oferecer vantagem moderada, sem invencibilidade.</li></ul></div><div class="card"><h2>A conquista tem prestígio</h2><ul class="features"><li>Ranking principal e eventos oficiais aceitam itens até +15.</li><li>Rankings de vitórias diário, semanal e mensal.</li><li>Semanal: duas partes diferentes, sorteadas do mesmo set especial +13; cinco famílias em rodízio, catálogo a confirmar.</li><li>Mata-Mata especial semanal proposto: uma parte +13.</li><li>Mensal: uma arma Full Excellent +15 de acordo com a classe do campeão.</li><li>TradePay depende de reserva segura do item, auditoria, antifraude e confirmação financeira autêntica.</li></ul></div></div>
  <div class="section-head"><h2>Curva de força exploratória</h2><small>Hipótese ainda não validada em duelos</small></div><div class="card"><div class="table-wrap"><table><caption class="tiny" style="padding:10px">Índice relativo ao mesmo equipamento; não é uma fórmula implementada de combate.</caption><thead><tr><th>NÍVEL</th><th>ÍNDICE EXPLORATÓRIO</th><th>ORIGEM PREVISTA</th></tr></thead><tbody>${Object.entries(power).map(([level,value])=>`<tr><td>+${level}</td><td>${value}</td><td>${level==='11'?'Editor comum':'Eventos oficiais / Donate'}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:15px">O resultado precisa considerar arma, set, asas, acessórios, reflect, defesa, vida, resistências, Excellent e buffs. A validação depende de centenas de duelos controlados entre as cinco classes.</p></div>
  <div class="section-head"><h2>Perguntas frequentes</h2></div><div class="help-list"><details><summary>Posso jogar ou editar itens reais?</summary><p>Ainda não. O GameServer e o inventário real não estão conectados. Os itens do editor são exemplos salvos apenas neste navegador.</p></details><details><summary>Posso depositar, doar ou sacar?</summary><p>Não. Pix, Donate, compras e saques reais permanecem desativados.</p></details><details><summary>O que funciona neste site?</summary><p>Quando o serviço web está disponível, cadastro, login, atendimento humano e gestão autorizada de conteúdo usam o backend do protótipo. Os recursos de jogo são demonstrativos.</p></details><details><summary>Como limpar a demonstração?</summary><p>Isso apaga somente os exemplos do painel neste navegador. Sua conta do site e suas conversas não serão apagadas.</p><button class="btn ghost" data-action="reset">Restaurar dados de exemplo</button></details></div>`;
}
const renderers = {inicio:renderInicio,conta:renderConta,jogo:renderJogo,personagens:renderPersonagens,baus:renderBaus,seguranca:renderSeguranca,editor:renderEditor,ranking:renderRanking,premios:renderPremios,mercado:renderMercado,carteira:renderCarteira,admin:renderAdmin,regras:renderRegras};
function setMenu(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('#menu-toggle').setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
  $('#nav-backdrop').hidden = !open;
}
function render(focus = false) {
  const pg = location.hash.slice(1);
  const page = Object.hasOwn(pages, pg) ? pg : 'inicio';
  $('#current-page').textContent = pages[page];
  $('#app').innerHTML = (demoPages.has(page) ? demoBanner() : '') + renderers[page]();
  document.querySelectorAll('#nav a').forEach(a => {
    const active = a.dataset.page === page;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  document.title = `${pages[page]} — MU EC`;
  setMenu(false);
  if (focus) { $('#app h1')?.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
}
function go(page) {
  if (location.hash === '#'+page) render(true); else location.hash = page;
}
async function loadIdentity(showMessage = false) {
  try {
    const response = await fetch('/api/auth/me', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(6000)});
    if (!response.ok) throw new Error('Serviço indisponível');
    const data = await response.json();
    if (!Object.hasOwn(data, 'user')) throw new Error('Resposta inválida');
    identity = {loading:false,available:true,user:data.user};
  } catch { identity = {loading:false,available:false,user:null}; }
  revealEmail = false;
  $('#sidebar-user').textContent = identity.user?.username || 'Bem-vindo ao MU EC';
  $('#sidebar-session').textContent = identity.user ? 'Conta do site conectada' : identity.available ? 'Navegação como visitante' : 'Serviço web indisponível';
  $('#topbar-user').textContent = identity.user?.username || 'Visitante';
  $('#logout-button').hidden = !identity.user;
  $('#login-link').hidden = Boolean(identity.user);
  $('#site-status').textContent = identity.available ? 'Serviço web conectado' : 'Demonstração local';
  $('#site-status').classList.toggle('offline', !identity.available);
  render();
  if (showMessage) notice(identity.available?'Sessão atualizada.':'Não foi possível consultar a sessão. Tente novamente em instantes.');
}
async function logout() {
  const buttons = document.querySelectorAll('[data-action="logout"]');
  buttons.forEach(button => button.disabled = true);
  try {
    const response = await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(6000)});
    if (!response.ok) throw new Error();
    await loadIdentity();
    notice('Sessão encerrada neste navegador.');
  } catch { notice('Não foi possível encerrar a sessão. Verifique sua conexão e tente novamente.'); }
  finally { document.querySelectorAll('[data-action="logout"]').forEach(button => button.disabled = false); }
}
function updateEditorPreview() {
  const preview = $('.preview-panel');
  if (preview) preview.innerHTML = itemPreview(editorDraft);
  const status = $('#editor-status');
  if (status) status.textContent = 'Alterações de exemplo ainda não salvas.';
}
function onMarket(id) {
  const listing = state.market.find(item => item.id === id);
  if (!listing) return;
  const next = {listed:'reserved',reserved:'paid',paid:'delivered',delivered:'settled'}[listing.status];
  if (!next) return;
  listing.status = next;
  if (next === 'settled') state.simulations.push({description:`Venda ilustrativa de ${listing.item} por ${money(listing.price)} (sem dinheiro real)`,date:new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})});
  save(); render();
  notice({reserved:'Reserva de exemplo, sem travar nenhum item real.',paid:'Pagamento simulado, sem Pix ou dinheiro real.',delivered:'Entrega simulada, sem alterar inventários.',settled:'Repasse simulado, sem crédito financeiro.'}[next]);
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-go],[data-action],[data-rank],[data-edit],[data-market]');
  if (!target) return;
  if (target.dataset.go) { go(target.dataset.go); return; }
  if (target.dataset.edit) { if (state.items.some(i => i.id === target.dataset.edit)) {state.selected = target.dataset.edit; editorDraft = null; save(); go('editor');} return; }
  if (target.dataset.rank) { if (['day','week','month'].includes(target.dataset.rank)) {state.rankPeriod=target.dataset.rank; save(); render();} return; }
  if (target.dataset.market) { onMarket(target.dataset.market); return; }
  switch (target.dataset.action) {
    case 'menu': setMenu(!$('#sidebar').classList.contains('open')); if ($('#sidebar').classList.contains('open')) $('#nav a')?.focus(); break;
    case 'logout': void logout(); break;
    case 'refresh-session': void loadIdentity(true); break;
    case 'reveal-email': revealEmail = !revealEmail; render(); $('[data-action="reveal-email"]')?.focus(); break;
    case 'character-demo': showCharacterDemo = !showCharacterDemo; render(); $('[data-action="character-demo"]')?.focus(); break;
    case 'save-item': {
      const item = getItem(), template = starterItems.find(i => i.id === item.id);
      if (!editorDraft || template.premium || item.level > 11) {notice('Equipamentos especiais não podem ser editados.'); return;}
      Object.assign(item, normalizeItem(template, editorDraft));
      state.lastSaved = new Date().toISOString();
      editorDraft = null;
      const stored = save(); render();
      if (stored) notice('Alterações de exemplo salvas somente neste navegador.');
      break;
    }
    case 'draw': { const first=Math.floor(Math.random()*5); let second=Math.floor(Math.random()*4); if (second>=first) second++; state.draw=[first,second]; save(); render(); notice('Sorteio de exemplo concluído. Nenhum prêmio real foi emitido.'); break; }
    case 'list-sale': {
      const item=state.items.find(i=>i.id === $('#sale-item').value), price=Number($('#sale-price').value);
      if (!item || !Number.isFinite(price) || price<1 || price>100000) {notice('Informe um preço demonstrativo entre R$ 1 e R$ 100.000.'); return;}
      if (state.market.length>=30) {notice('Limite de 30 anúncios de exemplo. Restaure a demonstração para começar novamente.'); return;}
      state.market.push({id:'m'+Date.now(),seller:'Jogador DEMO',item:item.name+' +'+item.level,icon:item.icon,price:Math.round(price*100)/100,status:'listed'});
      save(); render(); notice('Anúncio criado somente na demonstração.'); break;
    }
    case 'reset': if (window.confirm('Restaurar os exemplos deste navegador? Sua conta e suas conversas não serão alteradas.')) {state=defaultState(); editorDraft=null; save(); go('inicio'); notice('Demonstração restaurada.');} break;
  }
});
document.addEventListener('change', event => {
  const target=event.target;
  if (target.id === 'item-select') {if (state.items.some(i=>i.id===target.value)) {state.selected=target.value; editorDraft=null; save(); render();} return;}
  if (target.id === 'class-filter') {if (['ALL',...classes].includes(target.value)) {state.classFilter=target.value; save(); render();} return;}
  if (!editorDraft || getItem().premium || getItem().level>11) return;
  const rules=itemRules[editorDraft.type];
  if (['luck','skill'].includes(target.dataset.opt)) {
    if (!rules[target.dataset.opt]) return;
    editorDraft[target.dataset.opt]=target.checked; updateEditorPreview(); return;
  }
  if (target.id === 'additional-select') {
    const value=Number(target.value);
    if (rules.additional.includes(value)) {editorDraft.additional=value; updateEditorPreview();}
    return;
  }
  if (target.dataset.excellent) {
    const allowed=excellentOptions[editorDraft.type].map(([key])=>key);
    if (!allowed.includes(target.dataset.excellent)) return;
    editorDraft.excellent=editorDraft.excellent.filter(key=>key!==target.dataset.excellent);
    if (target.checked) editorDraft.excellent.push(target.dataset.excellent);
    updateEditorPreview();
  }
});
document.addEventListener('input', event => {
  if (event.target.id!=='level-slider' || !editorDraft || getItem().premium || getItem().level>11) return;
  editorDraft.level=Math.max(0,Math.min(11,Math.trunc(Number(event.target.value)||0)));
  $('#level-display').textContent='+'+editorDraft.level;
  updateEditorPreview();
});
$('#nav-backdrop').addEventListener('click',()=>{setMenu(false);$('#menu-toggle').focus();});
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#app').focus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape' && $('#sidebar').classList.contains('open')) {setMenu(false);$('#menu-toggle').focus();}});
window.addEventListener('hashchange',()=>render(true));
window.addEventListener('pageshow', event => {if(event.persisted) void loadIdentity();});
render();
void loadIdentity();
