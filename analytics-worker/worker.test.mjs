import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

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
test('no credentials, wrong password and cross-origin login reveal no counts', async () => {
  const { env } = environment();
  const page = await worker.fetch(new Request(base), env);
  assert.match(await page.text(), /administrator password/);
  assert.equal((await worker.fetch(login('wrong'), env)).status, 401);
  assert.equal((await worker.fetch(login(env.ADMIN_PASSWORD, 'https://evil.example'), env)).status, 403);
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
