/** MU EC development backend: native Node.js, one instance, no game or payment integration. */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.MU_HOST || '127.0.0.1';
const DB = process.env.MU_DATA_FILE || path.join(ROOT, '.data', 'store.json');
const HTTPS = process.env.MU_HTTPS === 'true';
const LIMIT = 16 * 1024;
const SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const roles = new Set(['player', 'moderator', 'gm', 'admin']);
const sessions = new Map();
const rate = new Map();
let store = { users: [], chats: [], articles: [], events: [] };
try {
  const saved = JSON.parse(await readFile(DB, 'utf8'));
  for (const key of Object.keys(store)) {
    if (saved[key] !== undefined && !Array.isArray(saved[key])) throw new Error('Invalid data store');
    store[key] = saved[key] || [];
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const uid = () => randomBytes(16).toString('hex');
const hash = (password, salt) => scryptSync(password, salt, 64).toString('hex');
const publicUser = user => user ? {
  id: user.id, username: user.username, email: user.email,
  role: user.role, created_at: user.created_at,
} : null;
const isStaff = user => Boolean(user && ['admin', 'gm', 'moderator'].includes(user.role));
const canPublish = user => Boolean(user && ['admin', 'gm'].includes(user.role));
const validEmail = value => typeof value === 'string' && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validNick = value => typeof value === 'string' && value.length >= 3 && value.length <= 25 && /^[a-zA-ZÀ-ÿ0-9_-]+$/.test(value);
const validText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
function addUser(data, email, username, password, role = 'player') {
  const salt = uid();
  const user = { id: uid(), email: email.toLowerCase(), username, role, salt,
    hash: hash(password, salt), created_at: new Date().toISOString() };
  data.users.push(user);
  return user;
}
async function save(data) {
  await mkdir(path.dirname(DB), { recursive: true, mode: 0o700 });
  await writeFile(DB + '.tmp', JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(DB + '.tmp', DB);
}
// Commit the in-memory state only after the atomic file replacement succeeds.
let queue = Promise.resolve();
function transact(change) {
  const job = queue.then(async () => {
    const next = structuredClone(store);
    const result = await change(next);
    await save(next);
    store = next;
    return result;
  });
  queue = job.catch(() => {});
  return job;
}
const adminEmail = process.env.MU_ADMIN_EMAIL;
const adminPass = process.env.MU_ADMIN_PASSWORD;
if (validEmail(adminEmail) && typeof adminPass === 'string' && adminPass.length >= 12 && adminPass.length <= 256 && !store.users.some(user => user.role === 'admin')) {
  const nickname = validNick(process.env.MU_ADMIN_NICK) ? process.env.MU_ADMIN_NICK : 'Administrador';
  await transact(data => {
    if (data.users.some(user => user.email === adminEmail.toLowerCase() || user.username.toLowerCase() === nickname.toLowerCase())) {
      throw new Error('E-mail ou apelido inicial da equipe já cadastrado. Configure uma identidade administrativa diferente. Nenhuma conta foi promovida.');
    }
    return addUser(data, adminEmail, nickname, adminPass, 'admin');
  });
  console.log('Conta administrativa inicial configurada por ambiente.');
}
function json(res, status, data, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin', ...extra,
  });
  res.end(JSON.stringify(data));
}
const fail = (res, status, message) => json(res, status, { error: message });
function sessionToken(req) {
  const value = /(?:^|;\s*)mu_session=([^;]*)/.exec(req.headers.cookie || '')?.[1];
  try { return value ? decodeURIComponent(value) : null; } catch { return null; }
}
function auth(req, data = store) {
  const token = sessionToken(req);
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expires <= Date.now()) { sessions.delete(token); return null; }
  return data.users.find(user => user.id === session.userId) || null;
}
function cookie(token, maxAge = SESSION_AGE / 1000) {
  return `mu_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${HTTPS ? '; Secure' : ''}`;
}
function newSession(user) {
  for (const [token, session] of sessions) if (session.expires <= Date.now()) sessions.delete(token);
  const token = uid();
  sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_AGE });
  return token;
}
function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0, rejected = false;
    req.on('data', chunk => {
      if (rejected) return;
      size += chunk.length;
      if (size > LIMIT) {
        rejected = true;
        chunks.length = 0;
        reject(new ApiError(413, 'Mensagem muito grande.'));
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid JSON object');
        resolve(data);
      } catch { reject(new ApiError(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}
function limit(req, action, max = 40) {
  const now = Date.now();
  for (const [key, value] of rate) if (now - value.since >= 60000) rate.delete(key);
  const key = `${req.socket.remoteAddress || 'unknown'}:${action}`;
  const value = rate.get(key) || { count: 0, since: now };
  value.count++;
  rate.set(key, value);
  return value.count <= max;
}
function requirePublisher(user) {
  if (!canPublish(user)) throw new ApiError(403, 'Publicação restrita a GM e administrador.');
}
function requireActor(req, data, permission = 'staff') {
  const actor = auth(req, data);
  if (!isStaff(actor) || (permission === 'admin' && actor.role !== 'admin')) {
    throw new ApiError(403, 'Sua sessão ou permissão não autoriza esta ação.');
  }
  if (permission === 'publisher') requirePublisher(actor);
  return actor;
}
function findChat(data, id) {
  const chat = data.chats.find(item => item.id === id);
  if (!chat) throw new ApiError(404, 'Conversa não encontrada.');
  return chat;
}
function requireAssignee(chat, user) {
  if (chat.assigned_to && chat.assigned_to !== user.id && user.role !== 'admin') {
    throw new ApiError(409, 'Esta conversa está atribuída a outro atendente.');
  }
}
async function route(req, res, url) {
  const user = auth(req), method = req.method, pathname = url.pathname;
  if (method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'mu-ec-portal', gameServer: 'not_connected' });
  }
  if (method === 'GET' && pathname === '/api/news') return json(res, 200, { articles: store.articles.slice().reverse().slice(0, 50) });
  if (method === 'GET' && pathname === '/api/events') return json(res, 200, { events: store.events.slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at)) });
  if (method === 'GET' && pathname === '/api/team') {
    return json(res, 200, { members: store.users.filter(isStaff).map(({ id, username, role }) => ({ id, username, role })) });
  }
  if (method === 'GET' && pathname === '/api/auth/me') return json(res, 200, { user: publicUser(user) });
  if (method === 'POST' && pathname === '/api/auth/register') {
    if (!limit(req, 'register', 3)) return fail(res, 429, 'Muitas tentativas. Aguarde um minuto.');
    const data = await body(req);
    if (!validEmail(data.email) || !validNick(data.username) || typeof data.password !== 'string' || data.password.length < 10 || data.password.length > 256) {
      return fail(res, 400, 'Dados inválidos. Use nome de 3 a 25 caracteres e senha de 10 a 256 caracteres.');
    }
    const account = await transact(next => {
      if (next.users.some(item => item.email === data.email.toLowerCase() || item.username.toLowerCase() === data.username.toLowerCase())) {
        throw new ApiError(409, 'E-mail ou nome de usuário indisponível.');
      }
      return addUser(next, data.email, data.username, data.password);
    });
    return json(res, 201, { user: publicUser(account) }, { 'Set-Cookie': cookie(newSession(account)) });
  }
  if (method === 'POST' && pathname === '/api/auth/login') {
    if (!limit(req, 'login', 9)) return fail(res, 429, 'Muitas tentativas. Aguarde um minuto.');
    const data = await body(req);
    const candidate = typeof data.email === 'string' ? store.users.find(item => item.email === data.email.toLowerCase()) : null;
    let matches = false;
    if (candidate && typeof data.password === 'string' && data.password.length <= 256) {
      try { matches = timingSafeEqual(Buffer.from(hash(data.password, candidate.salt), 'hex'), Buffer.from(candidate.hash, 'hex')); } catch {}
    }
    if (!matches) return fail(res, 401, 'Credenciais incorretas.');
    return json(res, 200, { user: publicUser(candidate) }, { 'Set-Cookie': cookie(newSession(candidate)) });
  }
  if (method === 'POST' && pathname === '/api/auth/logout') {
    sessions.delete(sessionToken(req));
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
  }
  if (method === 'POST' && pathname === '/api/chat/start') {
    if (!limit(req, 'chatstart', 4)) return fail(res, 429, 'Muitas tentativas. Aguarde um minuto.');
    const data = await body(req);
    if (!validText(data.message, 1, 1500) || !validNick(data.name)) return fail(res, 400, 'Informe seu nome (3–25 caracteres, sem espaços) e uma mensagem.');
    const chat = { id: uid(), token: uid(), visitor_id: user?.id || null, name: data.name,
      status: 'open', assigned_to: null, created_at: new Date().toISOString(),
      messages: [{ sender: 'user', body: data.message.trim(), created_at: new Date().toISOString() }] };
    await transact(next => next.chats.push(chat));
    return json(res, 201, { chat_id: chat.id, token: chat.token });
  }
  const chatMatch = /^\/api\/chat\/([a-f0-9]{32})$/.exec(pathname);
  if (method === 'GET' && chatMatch) {
    const chat = store.chats.find(item => item.id === chatMatch[1]);
    if (!chat || (!isStaff(user) && chat.token !== url.searchParams.get('token'))) return fail(res, 404, 'Conversa não encontrada.');
    return json(res, 200, { chat: { id: chat.id, status: chat.status, name: chat.name, assigned_to: chat.assigned_to || null }, messages: chat.messages });
  }
  if (method === 'POST' && pathname === '/api/chat/message') {
    if (!limit(req, 'chatmsg', 30)) return fail(res, 429, 'Mensagens demais.');
    const data = await body(req);
    await transact(next => {
      const chat = findChat(next, data.chat_id);
      if (chat.token !== data.token) throw new ApiError(404, 'Conversa não encontrada.');
      if (chat.status !== 'open') throw new ApiError(409, 'Conversa encerrada.');
      if (!validText(data.message, 1, 1500)) throw new ApiError(400, 'Mensagem inválida.');
      chat.messages.push({ sender: 'user', body: data.message.trim(), created_at: new Date().toISOString() });
    });
    return json(res, 200, { ok: true });
  }
  if (pathname.startsWith('/api/admin/')) {
    if (!isStaff(user)) return fail(res, 403, 'Acesso restrito à equipe.');
    if (method === 'GET' && pathname === '/api/admin/stats') {
      return json(res, 200, { accounts: store.users.length, openChats: store.chats.filter(chat => chat.status === 'open').length, news: store.articles.length, events: store.events.length });
    }
    if (method === 'GET' && pathname === '/api/admin/chats') {
      return json(res, 200, { chats: store.chats.map(chat => ({ id: chat.id, name: chat.name, status: chat.status,
        assigned_to: chat.assigned_to || null, assigned_name: store.users.find(item => item.id === chat.assigned_to)?.username || null,
        count: chat.messages.length, last_message_at: chat.messages.at(-1)?.created_at })).reverse() });
    }
    if (method === 'POST' && pathname === '/api/admin/assign-chat') {
      const data = await body(req);
      const chat = await transact(next => {
        const actor = requireActor(req, next);
        const target = findChat(next, data.chat_id);
        if (actor.role !== 'admin') {
          if (data.assignee_id !== undefined && data.assignee_id !== actor.id) throw new ApiError(403, 'Somente o administrador pode reatribuir conversas.');
          requireAssignee(target, actor);
        }
        const id = data.assignee_id === undefined ? actor.id : data.assignee_id;
        if (id !== null && !next.users.some(item => item.id === id && isStaff(item))) throw new ApiError(400, 'Atendente inválido.');
        target.assigned_to = id;
        return { id: target.id, assigned_to: id };
      });
      return json(res, 200, { chat });
    }
    if (method === 'POST' && pathname === '/api/admin/reply') {
      const data = await body(req);
      if (!validText(data.message, 1, 1500)) return fail(res, 400, 'Mensagem inválida.');
      await transact(next => {
        const actor = requireActor(req, next);
        const chat = findChat(next, data.chat_id);
        requireAssignee(chat, actor);
        if (chat.status !== 'open') throw new ApiError(409, 'Conversa encerrada.');
        chat.assigned_to ||= actor.id;
        chat.messages.push({ sender: 'moderator', by: actor.username, body: data.message.trim(), created_at: new Date().toISOString() });
      });
      return json(res, 200, { ok: true });
    }
    if (method === 'POST' && pathname === '/api/admin/close-chat') {
      const data = await body(req);
      await transact(next => {
        const actor = requireActor(req, next);
        const chat = findChat(next, data.chat_id);
        requireAssignee(chat, actor);
        chat.status = 'closed';
      });
      return json(res, 200, { ok: true });
    }
    if (pathname === '/api/admin/users' || pathname === '/api/admin/users/role') {
      if (user.role !== 'admin') return fail(res, 403, 'Gestão de permissões restrita ao administrador.');
      if (method === 'GET' && pathname === '/api/admin/users') return json(res, 200, { users: store.users.map(publicUser) });
      if (method === 'POST' && pathname === '/api/admin/users/role') {
        const data = await body(req);
        if (!roles.has(data.role)) return fail(res, 400, 'Permissão inválida.');
        const updated = await transact(next => {
          requireActor(req, next, 'admin');
          const target = next.users.find(item => item.id === data.user_id);
          if (!target) throw new ApiError(404, 'Conta não encontrada.');
          if (target.role === 'admin' && data.role !== 'admin' && next.users.filter(item => item.role === 'admin').length === 1) {
            throw new ApiError(409, 'A equipe precisa manter pelo menos um administrador.');
          }
          target.role = data.role;
          if (!isStaff(target)) for (const chat of next.chats) if (chat.assigned_to === target.id) chat.assigned_to = null;
          return publicUser(target);
        });
        return json(res, 200, { user: updated });
      }
    }
    if (method === 'POST' && pathname === '/api/admin/news') {
      requirePublisher(user);
      const data = await body(req);
      if (!validText(data.title, 4, 100) || !validText(data.body, 10, 2500)) return fail(res, 400, 'Título (4–100) e texto (10–2500) obrigatórios.');
      const article = { id: uid(), title: data.title.trim(), body: data.body.trim(), kind: 'NOTÍCIA', date: new Date().toISOString().slice(0, 10), by: user.username };
      await transact(next => { requireActor(req, next, 'publisher'); next.articles.push(article); });
      return json(res, 201, { article });
    }
    if (method === 'POST' && pathname === '/api/admin/remove-news') {
      requirePublisher(user);
      const data = await body(req);
      await transact(next => {
        requireActor(req, next, 'publisher');
        if (!next.articles.some(article => article.id === data.id)) throw new ApiError(404, 'Notícia não encontrada.');
        next.articles = next.articles.filter(article => article.id !== data.id);
      });
      return json(res, 200, { ok: true });
    }
    if (method === 'POST' && pathname === '/api/admin/events') {
      requirePublisher(user);
      const data = await body(req);
      if (!validText(data.title, 4, 100) || !validText(data.description, 10, 2500) || typeof data.starts_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(data.starts_at) || !Number.isFinite(Date.parse(data.starts_at))) {
        return fail(res, 400, 'Informe título (4–100), descrição (10–2500) e data com fuso horário.');
      }
      const event = { id: uid(), title: data.title.trim(), description: data.description.trim(), starts_at: new Date(data.starts_at).toISOString(), created_at: new Date().toISOString(), by: user.username };
      await transact(next => { requireActor(req, next, 'publisher'); next.events.push(event); });
      return json(res, 201, { event });
    }
    if (method === 'POST' && pathname === '/api/admin/remove-event') {
      requirePublisher(user);
      const data = await body(req);
      await transact(next => {
        requireActor(req, next, 'publisher');
        if (!next.events.some(event => event.id === data.id)) throw new ApiError(404, 'Evento não encontrado.');
        next.events = next.events.filter(event => event.id !== data.id);
      });
      return json(res, 200, { ok: true });
    }
  }
  return fail(res, 404, 'Rota não encontrada.');
}
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const expectedOrigin = `${HTTPS ? 'https' : 'http'}://${req.headers.host}`;
        let correctOrigin = true;
        if (req.headers.origin) {
          try { correctOrigin = new URL(req.headers.origin).origin === expectedOrigin; } catch { correctOrigin = false; }
        }
        if (!correctOrigin || req.headers['sec-fetch-site'] === 'cross-site') return fail(res, 403, 'Origem não autorizada.');
        if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
          return fail(res, 415, 'Envie o conteúdo como application/json.');
        }
      }
      return await route(req, res, url);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Método não aceito.');
    const location = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (location.includes('..') || location.includes('\\') || location.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(403); return res.end();
    }
    const target = path.resolve(ROOT, '.' + location);
    if (!target.startsWith(ROOT + path.sep) || !mime[path.extname(target)]) { res.writeHead(404); return res.end(); }
    let bytes;
    try { bytes = await readFile(target); } catch { res.writeHead(404); return res.end(); }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)], 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    if (!error.status) console.error('Falha no servidor MU EC:', error.code || error.name);
    if (!res.headersSent) fail(res, error.status || 500, error.status ? error.message : 'Erro interno.');
    else res.end();
  }
});
httpServer.requestTimeout = 30000;
httpServer.listen(PORT, HOST, () => {
  console.log(`MU EC em execução na porta ${httpServer.address().port}. Ambiente de desenvolvimento, sem GameServer ou pagamentos.`);
});
