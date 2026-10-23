import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { scryptSync } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ADMIN_EMAIL = 'admin-backend@example.invalid';
const ADMIN_PASSWORD = 'only-for-isolated-backend-tests-2026';
const PLAYER_PASSWORD = 'only-for-isolated-players-2026';

async function availablePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mu-ec-backend-'));
  const database = path.join(directory, 'store.json');
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  let child;
  let exited;
  let startupOutput = '';

  const stop = async () => {
    if (!child) return;
    const activeChild = child;
    if (activeChild.exitCode === null && activeChild.signalCode === null) activeChild.kill('SIGTERM');
    const timeout = setTimeout(() => {
      if (activeChild.exitCode === null && activeChild.signalCode === null) activeChild.kill('SIGKILL');
    }, 3000);
    try {
      await exited;
    } finally {
      clearTimeout(timeout);
      child = undefined;
    }
  };

  // Register cleanup before startup, so failed readiness also removes temporary data.
  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });

  const start = async () => {
    startupOutput = '';
    child = spawn(process.execPath, ['server.mjs'], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        MU_HOST: '127.0.0.1',
        MU_DATA_FILE: database,
        MU_ADMIN_EMAIL: ADMIN_EMAIL,
        MU_ADMIN_PASSWORD: ADMIN_PASSWORD,
        MU_ADMIN_NICK: 'AdminTeste',
        MU_HTTPS: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    exited = new Promise(resolve => {
      child.once('exit', resolve);
      child.once('error', resolve);
    });
    child.once('error', error => { startupOutput = error.message; });
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', chunk => { startupOutput = (startupOutput + chunk).slice(-4000); });
    }
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) break;
      try {
        const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(250) });
        if (response.ok && (await response.json()).ok === true) return;
      } catch { /* Wait for the server, without treating an open port as readiness. */ }
      await delay(50);
    }
    throw new Error(`Backend de testes não iniciou. ${startupOutput}`);
  };

  const request = async (route, options = {}) => {
    const { body, cookie, headers = {}, method = body === undefined ? 'GET' : 'POST', rawBody } = options;
    const response = await fetch(origin + '/api' + route, {
      method,
      headers: {
        ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: response.status,
      json: await response.json(),
      setCookie: response.headers.get('set-cookie'),
      cookie: response.headers.get('set-cookie')?.split(';')[0],
    };
  };

  await start();
  return { request, start, stop, origin, database };
}

test('MU EC: identidade, permissões, atendimento e persistência via HTTP', async t => {
  const server = await fixture(t);
  const { request } = server;
  const accounts = {};
  let adminCookie;
  let chat;
  let event;
  let article;

  await t.test('cadastro não concede cargo enviado pelo navegador e não expõe hashes', async () => {
    const anonymous = await request('/auth/me');
    assert.deepEqual(anonymous.json, { user: null });
    for (const name of ['PlayerTeste', 'ModeradorTeste', 'GMTeste']) {
      const email = name.toLowerCase() + '@example.invalid';
      const result = await request('/auth/register', {
        body: { email, username: name, password: PLAYER_PASSWORD, role: 'admin' },
      });
      assert.equal(result.status, 201);
      assert.equal(result.json.user.role, 'player');
      assert.equal(result.json.user.email, email);
      assert.ok(Number.isFinite(Date.parse(result.json.user.created_at)));
      for (const field of ['password', 'hash', 'salt']) assert.equal(field in result.json.user, false);
      assert.match(result.setCookie, /HttpOnly/i);
      assert.match(result.setCookie, /SameSite=Strict/i);
      accounts[name] = { ...result.json.user, cookie: result.cookie };
    }
    const admin = await request('/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    assert.equal(admin.status, 200);
    assert.equal(admin.json.user.role, 'admin');
    adminCookie = admin.cookie;
    for (const [name, role] of [['ModeradorTeste', 'moderator'], ['GMTeste', 'gm']]) {
      const promotion = await request('/admin/users/role', {
        cookie: adminCookie,
        body: { user_id: accounts[name].id, role },
      });
      assert.equal(promotion.status, 200);
    }
  });

  await t.test('sessão identifica somente a própria conta e logout a invalida', async () => {
    const player = accounts.PlayerTeste;
    const me = await request('/auth/me', { cookie: player.cookie });
    assert.equal(me.json.user.id, player.id);
    assert.equal(me.json.user.email, player.email);
    const logout = await request('/auth/logout', { cookie: player.cookie, body: {} });
    assert.equal(logout.status, 200);
    assert.match(logout.setCookie, /Max-Age=0/i);
    assert.deepEqual((await request('/auth/me', { cookie: player.cookie })).json, { user: null });
    const login = await request('/auth/login', { body: { email: player.email, password: PLAYER_PASSWORD } });
    assert.equal(login.status, 200);
    player.cookie = login.cookie;
  });

  await t.test('somente admin administra cargos e o último admin é preservado', async () => {
    for (const name of ['PlayerTeste', 'ModeradorTeste', 'GMTeste']) {
      assert.equal((await request('/admin/users', { cookie: accounts[name].cookie })).status, 403);
      assert.equal((await request('/admin/users/role', {
        cookie: accounts[name].cookie,
        body: { user_id: accounts[name].id, role: 'admin' },
      })).status, 403);
    }
    const list = await request('/admin/users', { cookie: adminCookie });
    assert.equal(list.status, 200);
    assert.equal(list.json.users.length, 4);
    const admin = list.json.users.find(user => user.role === 'admin');
    assert.equal((await request('/admin/users/role', {
      cookie: adminCookie, body: { user_id: admin.id, role: 'player' },
    })).status, 409);
    assert.equal((await request('/admin/users/role', {
      cookie: adminCookie, body: { user_id: accounts.PlayerTeste.id, role: 'superadmin' },
    })).status, 400);
    for (const user of list.json.users) {
      assert.equal('hash' in user, false);
      assert.equal('salt' in user, false);
    }
  });

  await t.test('a equipe pública não revela e-mails, senhas ou contas de jogadores', async () => {
    const team = await request('/team');
    assert.equal(team.status, 200);
    assert.deepEqual(team.json.members.map(member => member.role).sort(), ['admin', 'gm', 'moderator']);
    assert.equal(team.json.members.some(member => member.id === accounts.PlayerTeste.id), false);
    for (const member of team.json.members) {
      assert.deepEqual(Object.keys(member).sort(), ['id', 'role', 'username']);
    }
  });

  await t.test('mutações rejeitam origem cruzada, cross-site e conteúdo de formulário', async () => {
    const payload = { title: 'Notícia bloqueada', body: 'Uma tentativa de publicação por outra origem.' };
    for (const headers of [
      { Origin: 'https://untrusted.example.invalid' },
      { Origin: server.origin.replace('http:', 'https:') },
      { Origin: server.origin, 'Sec-Fetch-Site': 'cross-site' },
    ]) {
      assert.equal((await request('/admin/news', { cookie: adminCookie, body: payload, headers })).status, 403);
    }
    assert.equal((await request('/admin/news', {
      cookie: adminCookie, body: payload, headers: { 'Content-Type': 'text/plain' },
    })).status, 415);
    assert.equal((await request('/admin/news', {
      cookie: adminCookie, rawBody: '{', headers: { Origin: server.origin }, method: 'POST',
    })).status, 400);
    assert.equal((await request('/news')).json.articles.length, 0);
  });

  await t.test('moderador atende; GM e admin publicam notícias e agenda', async () => {
    const eventBody = {
      title: 'Mata-Mata de teste',
      description: 'Evento de teste, sem entrega real de itens ou recompensas.',
      starts_at: '2027-01-20T22:00:00.000Z',
    };
    const newsBody = { title: 'Novidades do MU EC', body: 'Esta notícia pertence exclusivamente à suíte isolada.' };
    for (const name of ['PlayerTeste', 'ModeradorTeste']) {
      assert.equal((await request('/admin/news', { cookie: accounts[name].cookie, body: newsBody })).status, 403);
      assert.equal((await request('/admin/events', { cookie: accounts[name].cookie, body: eventBody })).status, 403);
    }
    assert.equal((await request('/admin/events', {
      cookie: accounts.GMTeste.cookie, body: { ...eventBody, starts_at: 'amanhã' },
    })).status, 400);
    const publishedEvent = await request('/admin/events', { cookie: accounts.GMTeste.cookie, body: eventBody });
    assert.equal(publishedEvent.status, 201);
    const events = await request('/events');
    assert.equal(events.json.events.length, 1);
    event = events.json.events[0];
    assert.equal(event.title, eventBody.title);
    assert.equal(event.description, eventBody.description);
    const publishedNews = await request('/admin/news', { cookie: accounts.GMTeste.cookie, body: newsBody });
    assert.equal(publishedNews.status, 201);
    article = (await request('/news')).json.articles[0];
    assert.equal(article.title, newsBody.title);
    assert.equal(article.body, newsBody.body);
    assert.equal((await request('/admin/stats', { cookie: accounts.ModeradorTeste.cookie })).status, 200);
    assert.equal((await request('/admin/stats', { cookie: accounts.PlayerTeste.cookie })).status, 403);
  });

  await t.test('conversa privada exige token ou staff e respeita atribuição e encerramento', async () => {
    const started = await request('/chat/start', { body: { name: 'VisitanteTeste', message: 'Preciso de atendimento humano.' } });
    assert.equal(started.status, 201);
    chat = started.json;
    const route = '/chat/' + chat.chat_id;
    assert.equal((await request(route)).status, 404);
    assert.equal((await request(route, { cookie: accounts.PlayerTeste.cookie })).status, 404);
    assert.equal((await request(route + '?token=incorreto')).status, 404);
    assert.equal((await request(route + '?token=' + chat.token)).json.messages.length, 1);
    assert.equal((await request(route, { cookie: accounts.ModeradorTeste.cookie })).status, 200);
    assert.equal((await request('/admin/assign-chat', {
      cookie: accounts.ModeradorTeste.cookie, body: { chat_id: chat.chat_id },
    })).status, 200);
    assert.equal((await request('/admin/assign-chat', {
      cookie: accounts.GMTeste.cookie, body: { chat_id: chat.chat_id },
    })).status, 409);
    assert.equal((await request('/admin/assign-chat', {
      cookie: adminCookie, body: { chat_id: chat.chat_id, assignee_id: accounts.GMTeste.id },
    })).status, 200);
    const chats = await request('/admin/chats', { cookie: accounts.GMTeste.cookie });
    assert.equal(chats.json.chats[0].assigned_to, accounts.GMTeste.id);
    assert.equal(chats.json.chats[0].assigned_name, 'GMTeste');
    assert.equal((await request('/admin/reply', {
      cookie: accounts.GMTeste.cookie, body: { chat_id: chat.chat_id, message: 'Sou da equipe e vou ajudar.' },
    })).status, 200);
    const transcript = await request(route + '?token=' + chat.token);
    assert.equal(transcript.json.messages.length, 2);
    assert.equal(transcript.json.messages[1].sender, 'moderator');
    assert.equal((await request('/admin/close-chat', {
      cookie: accounts.GMTeste.cookie, body: { chat_id: chat.chat_id },
    })).status, 200);
    assert.equal((await request('/chat/message', {
      body: { chat_id: chat.chat_id, token: chat.token, message: 'Mais uma mensagem.' },
    })).status, 409);
  });

  await t.test('dados e cargos persistem após reinício; sessões antigas deixam de funcionar', async () => {
    const rawDatabase = await readFile(server.database, 'utf8');
    assert.equal(rawDatabase.includes(ADMIN_PASSWORD), false);
    assert.equal(rawDatabase.includes(PLAYER_PASSWORD), false);
    assert.equal((await stat(server.database)).mode & 0o077, 0, 'dados devem ser privados ao usuário do processo');
    await server.stop();
    await server.start();
    assert.deepEqual((await request('/auth/me', { cookie: adminCookie })).json, { user: null });
    const loggedIn = await request('/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    assert.equal(loggedIn.status, 200);
    adminCookie = loggedIn.cookie;
    const users = await request('/admin/users', { cookie: adminCookie });
    assert.equal(users.json.users.length, 4, 'reinício não deve criar um segundo admin');
    assert.equal(users.json.users.find(user => user.id === accounts.ModeradorTeste.id).role, 'moderator');
    assert.equal(users.json.users.find(user => user.id === accounts.GMTeste.id).role, 'gm');
    assert.equal((await request('/events')).json.events[0].id, event.id);
    assert.equal((await request('/news')).json.articles[0].id, article.id);
    const transcript = await request('/chat/' + chat.chat_id + '?token=' + chat.token);
    assert.equal(transcript.json.chat.status, 'closed');
    assert.equal(transcript.json.messages.length, 2);
  });

  await t.test('remoção de publicações exige permissão e atualiza as listagens', async () => {
    const playerLogin = await request('/auth/login', {
      body: { email: accounts.PlayerTeste.email, password: PLAYER_PASSWORD },
    });
    for (const [route, item] of [['/admin/remove-event', event], ['/admin/remove-news', article]]) {
      assert.equal((await request(route, { cookie: playerLogin.cookie, body: { id: item.id } })).status, 403);
      assert.equal((await request(route, { cookie: adminCookie, body: { id: item.id } })).status, 200);
    }
    assert.equal((await request('/events')).json.events.length, 0);
    assert.equal((await request('/news')).json.articles.length, 0);
  });

  await t.test('tentativas repetidas de login inválido recebem rate limit', async () => {
    const statuses = [];
    for (let index = 0; index < 10; index++) {
      statuses.push((await request('/auth/login', {
        body: { email: 'nao-existe@example.invalid', password: 'senha-invalida-de-teste' },
      })).status);
    }
    assert.equal(statuses[0], 401);
    assert.equal(statuses.at(-1), 429);
    assert.ok(statuses.includes(429));
  });
});

test('permissão revogada durante um POST parcial não permite recuperar o cargo', async t => {
  const server = await fixture(t);
  const { request } = server;
  const firstAdmin = await request('/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  assert.equal(firstAdmin.status, 200);
  const secondAccount = await request('/auth/register', {
    body: { email: 'second-admin@example.invalid', username: 'SegundoAdmin', password: PLAYER_PASSWORD },
  });
  assert.equal(secondAccount.status, 201);
  assert.equal((await request('/admin/users/role', {
    cookie: firstAdmin.cookie,
    body: { user_id: secondAccount.json.user.id, role: 'admin' },
  })).status, 200);

  const payload = JSON.stringify({ user_id: firstAdmin.json.user.id, role: 'admin' });
  const heldRequest = httpRequest(server.origin + '/api/admin/users/role', {
    method: 'POST',
    headers: {
      Cookie: firstAdmin.cookie,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      Expect: '100-continue',
    },
  });
  t.after(() => heldRequest.destroy());
  heldRequest.setTimeout(5000, () => heldRequest.destroy(new Error('POST parcial excedeu o tempo limite')));
  const accepted = once(heldRequest, 'continue');
  const completed = new Promise((resolve, reject) => {
    heldRequest.once('error', reject);
    heldRequest.once('response', response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.once('error', reject);
      response.once('end', () => resolve({ status: response.statusCode, text }));
    });
  });
  // Cleanup can abort this request if an earlier assertion fails; handle rejection immediately.
  completed.catch(() => {});
  heldRequest.flushHeaders();
  // Node's HTTP server acknowledges Expect before dispatching the request handler. The
  // observable acknowledgement lets it reach body() while the initial role is still admin.
  await accepted;
  const split = Math.floor(payload.length / 2);
  await new Promise((resolve, reject) => heldRequest.write(payload.slice(0, split), error => error ? reject(error) : resolve()));

  const revoked = await request('/admin/users/role', {
    cookie: secondAccount.cookie,
    body: { user_id: firstAdmin.json.user.id, role: 'player' },
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.json.user.role, 'player');
  heldRequest.end(payload.slice(split));
  const result = await completed;
  assert.equal(result.status, 403, 'a transação deve revalidar o cargo após ler o corpo');
  const users = await request('/admin/users', { cookie: secondAccount.cookie });
  assert.equal(users.status, 200);
  assert.equal(users.json.users.find(user => user.id === firstAdmin.json.user.id).role, 'player');
  assert.equal(users.json.users.filter(user => user.role === 'admin').length, 1);
});

test('bootstrap recusa identidade que já pertence a um jogador', async t => {
  for (const collision of ['email', 'nickname']) {
    await t.test('colisão de ' + collision + ' não cria nem promove contas', async t => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'mu-ec-bootstrap-'));
      t.after(() => rm(directory, { recursive: true, force: true }));
      const database = path.join(directory, 'store.json');
      const salt = 'only-for-bootstrap-regression-test';
      const player = {
        id: '11111111111111111111111111111111',
        email: collision === 'email' ? ADMIN_EMAIL : 'existing-player@example.invalid',
        username: collision === 'nickname' ? 'ADMINTESTE' : 'JogadorExistente',
        role: 'player', salt,
        hash: scryptSync(PLAYER_PASSWORD, salt, 64).toString('hex'),
        created_at: '2026-10-23T00:00:00.000Z',
      };
      const original = { users: [player], chats: [], articles: [], events: [] };
      await writeFile(database, JSON.stringify(original), { mode: 0o600 });
      const child = spawn(process.execPath, ['server.mjs'], {
        cwd: ROOT,
        env: {
          ...process.env,
          PORT: '0', MU_HOST: '127.0.0.1', MU_HTTPS: 'false',
          MU_DATA_FILE: database,
          MU_ADMIN_EMAIL: ADMIN_EMAIL,
          MU_ADMIN_NICK: 'AdminTeste',
          MU_ADMIN_PASSWORD: ADMIN_PASSWORD,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      t.after(() => child.kill('SIGKILL'));
      let output = '', timedOut = false;
      for (const stream of [child.stdout, child.stderr]) {
        stream.on('data', chunk => { output = (output + chunk).slice(-4000); });
      }
      const finished = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code, signal) => resolve({ code, signal }));
      });
      const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 3000);
      let result;
      try { result = await finished; } finally { clearTimeout(timeout); }
      assert.equal(timedOut, false, 'bootstrap deve recusar a colisão antes de iniciar o serviço');
      assert.notEqual(result.code, 0);
      assert.equal(result.signal, null);
      assert.match(output, /já cadastrado.*identidade administrativa diferente/is);
      const saved = JSON.parse(await readFile(database, 'utf8'));
      assert.deepEqual(saved, original, 'bootstrap não pode duplicar nem promover a conta existente');
    });
  }
});
