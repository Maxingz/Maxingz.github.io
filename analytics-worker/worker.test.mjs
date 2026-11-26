import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const base = 'https://mg.example.workers.dev';
function environment() {
  const visitors = new Set(), daily = new Set();
  const env = {
    ADMIN_PASSWORD: 'a-random-test-password-long-enough', SESSION_SECRET: 's'.repeat(40), IP_HASH_SECRET: 'i'.repeat(40),
    SITE_ORIGIN: 'https://maxingz.github.io',
    LOGIN_LIMIT: { limit: async () => ({ success: true }) },
    TRACK_LIMIT: { limit: async () => ({ success: true }) },
    DB: {
      prepare(sql) {
        return { sql, args: [], bind(...args) { this.args = args; return this; },
          async first() { return { count: sql.includes('daily_visitors') ? daily.size : visitors.size }; },
          async all() { return { results: [] }; } };
      },
      async batch(statements) {
        visitors.add(statements[0].args[0]); daily.add(statements[1].args.join(':'));
      }
    }
  };
  return { env, visitors };
}
function login(password, origin = base) {
  return new Request(base + '/login', { method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' }, body: new URLSearchParams({ password }) });
}
test('admin password accepts 10 characters and rejects fewer', async () => {
  const { env } = environment();
  env.ADMIN_PASSWORD = 'test-12345';
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD), env)).status, 303);
  env.ADMIN_PASSWORD = 'test-1234';
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD), env)).status, 503);
});
test('no credentials, wrong password and cross-origin login reveal no counts', async () => {
  const { env } = environment();
  const page = await worker.fetch(new Request(base), env);
  assert.equal(page.headers.get('Referrer-Policy'), 'same-origin');
  assert.match(await page.text(), /administrator password/);
  assert.equal((await worker.fetch(login('wrong'), env)).status, 401);
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD, 'https://evil.example'), env)).status, 403);
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD, 'null'), env)).status, 403);
  const missingOrigin = login(env.ADMIN_PASSWORD);
  missingOrigin.headers.delete('Origin');
  assert.equal((await worker.fetch(missingOrigin, env)).status, 403);
});
test('correct password creates a secure session; tampering and expired sessions fail', async () => {
  const { env } = environment();
  const result = await worker.fetch(login(env.ADMIN_PASSWORD), env);
  assert.equal(result.status, 303);
  const cookie = result.headers.get('Set-Cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict']) assert.ok(cookie.includes(flag));
  const session = cookie.split(';')[0];
  const view = await worker.fetch(new Request(base, { headers: { Cookie: session } }), env);
  assert.match(await view.text(), /Unique IPs today/);
  const invalid = session.slice(0, -1) + (session.endsWith('a') ? 'b' : 'a');
  assert.match(await (await worker.fetch(new Request(base, { headers: { Cookie: invalid } }), env)).text(), /administrator password/);
  const originalNow = Date.now;
  try {
    Date.now = () => originalNow() + 9 * 3600000;
    assert.match(await (await worker.fetch(new Request(base, { headers: { Cookie: session } }), env)).text(), /administrator password/);
  } finally { Date.now = originalNow; }
  const logout = await worker.fetch(new Request(base + '/logout', { method: 'POST', headers: { Origin: base } }), env);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
});
test('counts deduplicate IPs without storing the address; rejects other origins and respects GPC', async () => {
  const { env, visitors } = environment();
  const track = (ip, extra = {}) => new Request(base + '/track', { method: 'POST', headers: { Origin: env.SITE_ORIGIN, 'CF-Connecting-IP': ip, ...extra } });
  assert.equal((await worker.fetch(track('192.0.2.1'), env)).status, 204);
  await worker.fetch(track('192.0.2.1'), env);
  assert.equal(visitors.size, 1);
  await worker.fetch(track('192.0.2.2'), env);
  assert.equal(visitors.size, 2);
  assert.ok([...visitors].every(id => /^[a-f0-9]{64}$/.test(id)));
  assert.equal((await worker.fetch(track('192.0.2.3', { Origin: 'https://evil.example' }), env)).status, 403);
  await worker.fetch(track('192.0.2.4', { 'Sec-GPC': '1' }), env);
  assert.equal(visitors.size, 2);
});
test('rate limits and missing secrets fail closed', async () => {
  const { env } = environment();
  env.LOGIN_LIMIT.limit = async () => ({ success: false });
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD), env)).status, 429);
  delete env.SESSION_SECRET;
  assert.equal((await worker.fetch(new Request(base), env)).status, 503);
});
test('visit migration preserves history, counts page loads and paginates private visitor IDs', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(new URL('./migrations/0001_visitors.sql', import.meta.url), 'utf8'));
    db.prepare('INSERT INTO visitors VALUES (?, ?)').run('historical-id', '2026-01-01');
    db.exec(readFileSync(new URL('./migrations/0002_visit_counts.sql', import.meta.url), 'utf8'));
    assert.equal(db.prepare('SELECT visit_count FROM visitors').get().visit_count, 0);
    const { env } = environment();
    env.DB = {
      prepare(sql) {
        return { args: [], bind(...args) { this.args = args; return this; },
          async first() { return db.prepare(sql).get(...this.args); },
          async all() { return { results: db.prepare(sql).all(...this.args) }; },
          run() { return db.prepare(sql).run(...this.args); } };
      },
      async batch(statements) { return statements.map(statement => statement.run()); }
    };
    const track = () => new Request(base + '/track', { method: 'POST', headers: { Origin: env.SITE_ORIGIN, 'CF-Connecting-IP': '192.0.2.9' } });
    assert.equal((await worker.fetch(track(), env)).status, 204);
    assert.equal((await worker.fetch(track(), env)).status, 204);
    const visitor = db.prepare('SELECT * FROM visitors WHERE id != ?').get('historical-id');
    assert.equal(visitor.visit_count, 2);
    assert.match(visitor.id, /^[a-f0-9]{64}$/);
    assert.ok(visitor.last_seen);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM visitors').get().count, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_visitors').get().count, 1);
    const session = (await worker.fetch(login(env.ADMIN_PASSWORD), env)).headers.get('Set-Cookie').split(';')[0];
    const html = await (await worker.fetch(new Request(base, { headers: { Cookie: session } }), env)).text();
    assert.ok(html.includes(visitor.id));
    assert.match(html, /<td>2<\/td>/);
    const publicHtml = await (await worker.fetch(new Request(base), env)).text();
    assert.ok(!publicHtml.includes(visitor.id));
    for (let i = 0; i < 55; i++) db.prepare('INSERT INTO visitors (id, first_day) VALUES (?, ?)').run(`extra-${i}`, '2026-02-01');
    const secondPage = await (await worker.fetch(new Request(base + '/?page=2', { headers: { Cookie: session } }), env)).text();
    assert.match(secondPage, /Page 2 of 2/);
    assert.ok(secondPage.includes('historical-id'));
  } finally { db.close(); }
});
