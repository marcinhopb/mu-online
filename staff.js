'use strict';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const roles = { player: 'Jogador', moderator: 'Moderador', gm: 'Game Master', admin: 'Administrador' };
const state = { user: null, chats: [], users: [], selected: null, transcript: '', loading: false, view: 'atendimento' };
let notificationTimer;
let chatRequest = 0;

async function api(route, options = {}) {
  const response = await fetch('/api' + route, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível concluir a solicitação.'), { status: response.status });
  return data;
}
const post = (route, data) => api(route, { method: 'POST', body: JSON.stringify(data) });
const canPublish = () => ['admin', 'gm'].includes(state.user?.role);
const isAdmin = () => state.user?.role === 'admin';
const formatDate = (value, includeTime = false) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
};

function notify(message) {
  clearTimeout(notificationTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  notificationTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function showError(message = '') {
  $('staff-error').textContent = message;
  $('staff-error').hidden = !message;
}
function denyAccess(message) {
  state.user = null;
  $('admin-console').hidden = true;
  $('permission').hidden = false;
  $('permission').innerHTML = `<span class="eyebrow">ACESSO RESTRITO</span><h1>Entre com uma conta da equipe.</h1><p>${esc(message)}</p><p>Esta central é exclusiva para administradores, Game Masters e moderadores autorizados. Contas comuns não têm acesso.</p><a class="button gold" href="index.html#login">Fazer login no site <span aria-hidden="true">↗</span></a><a class="text-link" href="index.html">Voltar ao início</a>`;
}
function configureAccess() {
  document.querySelectorAll('[data-content-only]').forEach(element => { element.hidden = !canPublish(); });
  document.querySelectorAll('[data-admin-only]').forEach(element => { element.hidden = !isAdmin(); });
  $('staff-name').textContent = state.user.username;
  $('staff-role').textContent = roles[state.user.role];
  navigate();
}
function navigate() {
  const page = location.hash.slice(1) || 'atendimento';
  const allowed = page === 'atendimento' || (['noticias', 'eventos'].includes(page) && canPublish()) || (page === 'equipe' && isAdmin());
  state.view = allowed ? page : 'atendimento';
  document.querySelectorAll('.view').forEach(section => { section.hidden = section.id !== 'view-' + state.view; });
  document.querySelectorAll('[data-view-link]').forEach(link => {
    if (link.dataset.viewLink === state.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${({ atendimento: 'Atendimento', noticias: 'Notícias', eventos: 'Eventos', equipe: 'Permissões' })[state.view]} · Equipe MU EC`;
}

function renderChats() {
  const filter = $('chat-filter').value;
  const chats = state.chats.filter(chat => filter === 'all' || (filter === 'mine' ? chat.status === 'open' && chat.assigned_to === state.user.id : chat.status === filter));
  const markup = chats.map(chat => `<button type="button" class="chat-row ${state.selected === chat.id ? 'active' : ''}" data-chat="${esc(chat.id)}" aria-pressed="${state.selected === chat.id}"><span><b>${esc(chat.name)}</b><small>${Number(chat.count)} mensagens · ${chat.status === 'open' ? 'Aberta' : 'Encerrada'}</small><small>${chat.assigned_name ? 'Com ' + esc(chat.assigned_name) : 'Sem responsável'}</small></span><span class="chat-arrow" aria-hidden="true">↗</span></button>`).join('') || '<p class="empty-state">Nenhuma conversa nesta fila.</p>';
  if ($('chats-list').innerHTML !== markup) $('chats-list').innerHTML = markup;
}
function renderNews(articles) {
  $('news-list').innerHTML = articles.map(article => `<article class="content-row"><h4>${esc(article.title)}</h4><p>${esc(article.body)}</p><div class="content-meta"><small>${esc(formatDate(article.date))}${article.by ? ' · ' + esc(article.by) : ''}</small><button class="button danger" type="button" data-delete-news="${esc(article.id)}" aria-label="Excluir notícia: ${esc(article.title)}">Excluir</button></div></article>`).join('') || '<p class="empty-state">Nenhuma notícia publicada. As primeiras novidades começam aqui.</p>';
}
function renderEvents(events) {
  $('events-list').innerHTML = events.map(event => `<article class="content-row"><span class="content-date">${esc(formatDate(event.starts_at, true))}</span><h4>${esc(event.title)}</h4><p>${esc(event.description)}</p><div class="content-meta"><small>Publicado por ${esc(event.by || 'Equipe')}</small><button class="button danger" type="button" data-delete-event="${esc(event.id)}" aria-label="Excluir evento: ${esc(event.title)}">Excluir</button></div></article>`).join('') || '<p class="empty-state">A agenda está vazia. Nenhum evento confirmado.</p>';
}
function renderUsers() {
  const search = $('user-search').value.trim().toLocaleLowerCase('pt-BR');
  const users = state.users.filter(user => (user.username + ' ' + user.email).toLocaleLowerCase('pt-BR').includes(search));
  $('users-list').innerHTML = users.map(user => `<form class="user-row" data-role-form="${esc(user.id)}"><div><strong>${esc(user.username)}</strong>${user.id === state.user.id ? '<span class="self-label">Sua conta</span>' : ''}<small>${esc(user.email)}</small><small>Desde ${esc(formatDate(user.created_at))} · ${esc(roles[user.role] || user.role)}</small></div><div class="user-controls"><label class="sr-only" for="role-${esc(user.id)}">Função de ${esc(user.username)}</label><select id="role-${esc(user.id)}" name="role">${Object.entries(roles).map(([value, label]) => `<option value="${value}" ${user.role === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="button outline" type="submit">Salvar função</button></div></form>`).join('') || '<p class="empty-state">Nenhuma conta encontrada.</p>';
  if (document.activeElement !== $('chat-assignee')) {
    const current = $('chat-assignee').value;
    $('chat-assignee').innerHTML = '<option value="">Sem responsável</option>' + state.users.filter(user => ['admin', 'gm', 'moderator'].includes(user.role)).map(user => `<option value="${esc(user.id)}">${esc(user.username)} · ${esc(roles[user.role])}</option>`).join('');
    $('chat-assignee').value = current;
  }
}
async function selectChat(id) {
  const request = ++chatRequest;
  try {
    const data = await api('/chat/' + encodeURIComponent(id));
    if (request !== chatRequest || !state.user) return;
    if (state.selected !== id) $('reply-message').value = '';
    state.selected = id;
    $('selected-label').textContent = data.chat.name;
    $('conversation-status').hidden = false;
    $('conversation-status').textContent = data.chat.status === 'open' ? 'Aberta' : 'Encerrada';
    $('conversation-status').classList.toggle('closed', data.chat.status !== 'open');
    const transcript = JSON.stringify({ id, messages: data.messages });
    if (state.transcript !== transcript) {
      state.transcript = transcript;
      $('selected-messages').innerHTML = data.messages.map(message => `<div class="bubble ${message.sender === 'moderator' ? 'moderator' : 'user'}"><p>${esc(message.body)}</p><small>${message.sender === 'moderator' ? esc(message.by || 'Equipe') : esc(data.chat.name)} · ${esc(formatDate(message.created_at, true))}</small></div>`).join('');
      $('selected-messages').scrollTop = $('selected-messages').scrollHeight;
    }
    const conversation = state.chats.find(chat => chat.id === id);
    $('assignment-controls').hidden = false;
    $('assigned-label').textContent = conversation?.assigned_name ? 'Responsável: ' + conversation.assigned_name : 'Sem responsável atribuído.';
    $('claim-chat').hidden = conversation?.assigned_to === state.user.id;
    if (isAdmin() && document.activeElement !== $('chat-assignee')) $('chat-assignee').value = conversation?.assigned_to || '';
    $('reply-message').disabled = false;
    $('send-reply').disabled = false;
    $('close-chat').disabled = data.chat.status !== 'open';
    renderChats();
  } catch (error) { showError(error.message); }
}

async function refresh({ users = false } = {}) {
  if (!state.user || state.loading) return;
  state.loading = true;
  try {
    const requests = [api('/admin/stats'), api('/admin/chats')];
    if (canPublish()) requests.push(api('/news'), api('/events'));
    if (isAdmin() && (users || !state.users.length)) requests.push(api('/admin/users'));
    const results = await Promise.all(requests);
    const [stats, chatData] = results;
    $('stat-users').textContent = stats.accounts;
    $('stat-chats').textContent = stats.openChats;
    $('stat-news').textContent = stats.news;
    $('stat-events').textContent = stats.events ?? 0;
    state.chats = chatData.chats;
    renderChats();
    if (canPublish()) { renderNews(results[2].articles); renderEvents(results[3].events); }
    if (isAdmin() && (users || !state.users.length)) { state.users = results[canPublish() ? 4 : 2].users; renderUsers(); }
    if (state.selected) await selectChat(state.selected);
    $('sync-status').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    showError();
  } catch (error) {
    if ([401, 403].includes(error.status)) {
      try {
        const identity = await api('/auth/me');
        if (!['admin', 'gm', 'moderator'].includes(identity.user?.role)) return denyAccess('Sua sessão expirou ou sua função foi alterada.');
        state.user = identity.user;
        configureAccess();
      } catch { denyAccess('Entre novamente para continuar.'); }
    }
    showError(error.message);
    $('sync-status').textContent = 'Atualização interrompida';
  } finally { state.loading = false; }
}

async function runAction(button, task) {
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try { await task(); showError(); }
  catch (error) { showError(error.message); notify(error.message); }
  finally {
    if (button) {
      button.disabled = false;
      if (button.id === 'close-chat') button.disabled = state.chats.find(chat => chat.id === state.selected)?.status !== 'open';
    }
  }
}

document.addEventListener('click', event => {
  const chatButton = event.target.closest('[data-chat]');
  if (chatButton) return void selectChat(chatButton.dataset.chat);
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'refresh-chat') return void refresh();
  if (button.id === 'refresh-users') return void refresh({ users: true });
  if (button.id === 'staff-logout') return void runAction(button, async () => { await post('/auth/logout', {}); denyAccess('Você saiu da sua conta com segurança.'); });
  if (button.id === 'close-chat' && state.selected) return void runAction(button, async () => { await post('/admin/close-chat', { chat_id: state.selected }); await refresh(); notify('Conversa encerrada.'); });
  if (button.id === 'claim-chat' && state.selected) return void runAction(button, async () => { await post('/admin/assign-chat', { chat_id: state.selected }); await refresh(); notify('Atendimento atribuído a você.'); });
  if (button.id === 'assign-chat' && state.selected) return void runAction(button, async () => { await post('/admin/assign-chat', { chat_id: state.selected, assignee_id: $('chat-assignee').value || null }); await refresh(); notify('Responsável atualizado.'); });
  if (button.dataset.deleteNews && confirm('Excluir esta notícia do portal?')) return void runAction(button, async () => { await post('/admin/remove-news', { id: button.dataset.deleteNews }); await refresh(); notify('Notícia excluída.'); });
  if (button.dataset.deleteEvent && confirm('Excluir este evento da agenda?')) return void runAction(button, async () => { await post('/admin/remove-event', { id: button.dataset.deleteEvent }); await refresh(); notify('Evento removido da agenda.'); });
});

document.addEventListener('submit', event => {
  if (event.target.id === 'staff-reply') {
    event.preventDefault();
    if (!state.selected) return notify('Escolha uma conversa antes de responder.');
    return void runAction(event.submitter, async () => { await post('/admin/reply', { chat_id: state.selected, message: $('reply-message').value }); $('reply-message').value = ''; await refresh(); notify('Resposta enviada ao jogador.'); });
  }
  if (event.target.id === 'news-form') {
    event.preventDefault();
    return void runAction(event.submitter, async () => { await post('/admin/news', { title: $('news-title').value, body: $('news-body').value }); event.target.reset(); await refresh(); notify('Notícia publicada no portal.'); });
  }
  if (event.target.id === 'event-form') {
    event.preventDefault();
    return void runAction(event.submitter, async () => {
      const date = new Date($('event-start').value);
      if (Number.isNaN(date.getTime())) throw new Error('Informe uma data válida para o evento.');
      await post('/admin/events', { title: $('event-title').value, description: $('event-description').value, starts_at: date.toISOString() });
      event.target.reset(); await refresh(); notify('Evento publicado na agenda do site.');
    });
  }
  if (event.target.dataset.roleForm) {
    event.preventDefault();
    const target = state.users.find(user => user.id === event.target.dataset.roleForm);
    const role = new FormData(event.target).get('role');
    if (!target || target.role === role) return notify('Essa conta já possui a função selecionada.');
    if (!confirm(`Alterar a função de ${target.username} para ${roles[role]}?`)) return;
    return void runAction(event.submitter, async () => {
      await post('/admin/users/role', { user_id: target.id, role });
      const identity = await api('/auth/me');
      if (!['admin', 'gm', 'moderator'].includes(identity.user?.role)) return denyAccess('A função da sua conta foi alterada.');
      state.user = identity.user; configureAccess();
      await refresh({ users: true }); notify('Permissão da conta atualizada.');
    });
  }
});
$('chat-filter').addEventListener('change', renderChats);
$('user-search').addEventListener('input', renderUsers);
window.addEventListener('hashchange', () => { if (state.user) navigate(); });
async function init() {
  try {
    const identity = await api('/auth/me');
    if (!['admin', 'gm', 'moderator'].includes(identity.user?.role)) return denyAccess('Faça login no site com uma conta autorizada para continuar.');
    state.user = identity.user;
    configureAccess();
    $('permission').hidden = true;
    $('admin-console').hidden = false;
    await refresh({ users: true });
  } catch { denyAccess('A central não está disponível nesta hospedagem ou não foi possível verificar sua sessão.'); }
}
void init();
setInterval(() => { if (state.user && !document.hidden) void refresh(); }, 7000);
