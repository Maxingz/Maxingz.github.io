import { loginPage, dashboardPage } from './pages.mjs';

const encoder = new TextEncoder();
const cookieName = '__Host-mg_session';
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(secret, text) {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(text)));
}
async function verify(secret, text, signature) {
  if (!/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const bytes = Uint8Array.from(signature.match(/../g), b => parseInt(b, 16));
  return crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(text));
}
function response(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    // Preserve Origin on same-origin form POSTs so the CSRF check can validate them.
    'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    'Content-Type': 'text/html; charset=utf-8', ...extra
  } });
}
function cookie(value, age) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}
async function authenticated(request, env) {
  const token = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [expires, nonce, signature] = token.split('.');
  if (!/^\d+$/.test(expires) || !/^[a-f0-9]{32}$/.test(nonce || '')) return false;
  const remaining = Number(expires) - Date.now();
  return remaining > 0 && remaining <= 8 * 3600000 && verify(env.SESSION_SECRET, `${expires}.${nonce}`, signature);
}
export default {
  async fetch(request, env) {
    try {
      if (!env.DB || !env.LOGIN_LIMIT || !env.TRACK_LIMIT ||
          env.ADMIN_PASSWORD?.length < 10 || !env.ADMIN_PASSWORD ||
          !env.IP_HASH_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
        return response('Dashboard setup is not complete.', 503);
      }
      const url = new URL(request.url);
      const origin = request.headers.get('Origin');
      if (url.pathname === '/track') {
        if (origin !== env.SITE_ORIGIN) return response('Forbidden', 403);
        const cors = { 'Access-Control-Allow-Origin': env.SITE_ORIGIN, 'Vary': 'Origin' };
        if (request.method === 'OPTIONS') return response(null, 204, { ...cors, 'Access-Control-Allow-Methods': 'POST' });
        if (request.method !== 'POST') return response('Method not allowed', 405);
        if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return response(null, 204, cors);
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) return response('Missing visitor address', 400);
        const id = await sign(env.IP_HASH_SECRET, ip);
        if (!(await env.TRACK_LIMIT.limit({ key: id })).success) return response('Try later', 429, cors);
        const now = new Date().toISOString();
        const day = now.slice(0, 10);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO visitors (id, first_day, visit_count, last_seen) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET visit_count = visitors.visit_count + 1, last_seen = excluded.last_seen').bind(id, day, now),
          env.DB.prepare('INSERT OR IGNORE INTO daily_visitors (day, visitor_id) VALUES (?, ?)').bind(day, id)
        ]);
        return response(null, 204, cors);
      }
      if (request.method === 'POST' && ['/login', '/logout'].includes(url.pathname)) {
        if (origin !== url.origin) return response('Forbidden', 403);
        if (url.pathname === '/logout') return response(null, 303, { Location: '/', 'Set-Cookie': cookie('', 0) });
        // Limit all attempts, including successful ones. No password or IP is logged.
        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) return response('Missing client address', 400);
        if (!(await env.LOGIN_LIMIT.limit({ key: await sign(env.IP_HASH_SECRET, ip) })).success) {
          return response(loginPage('Too many attempts. Wait a minute and try again.'), 429);
        }
        if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return response('Invalid form', 400);
        // Read a bounded body even when Content-Length is missing or forged.
        const reader = request.body?.getReader();
        let length = 0, chunks = [];
        if (reader) while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 2048) { await reader.cancel(); return response('Form too large', 413); }
          chunks.push(value);
        }
        const bytes = new Uint8Array(length); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        const password = new URLSearchParams(new TextDecoder().decode(bytes)).get('password') || '';
        if (!await verify(env.SESSION_SECRET, password, await sign(env.SESSION_SECRET, env.ADMIN_PASSWORD))) {
          return response(loginPage('Incorrect password.'), 401);
        }
        const payload = `${Date.now() + 8 * 3600000}.${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
        return response(null, 303, { Location: '/', 'Set-Cookie': cookie(`${payload}.${await sign(env.SESSION_SECRET, payload)}`, 8 * 3600) });
      }
      if (request.method !== 'GET' || url.pathname !== '/') return response('Not found', 404);
      if (!await authenticated(request, env)) return response(loginPage());
      const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM visitors').first();
      const today = await env.DB.prepare('SELECT COUNT(*) AS count FROM daily_visitors WHERE day = ?').bind(new Date().toISOString().slice(0, 10)).first();
      const daily = await env.DB.prepare('SELECT day, COUNT(*) AS count FROM daily_visitors GROUP BY day ORDER BY day DESC LIMIT 30').all();
      const pageSize = 50;
      const pageCount = Math.max(1, Math.ceil(total.count / pageSize));
      const requestedPage = Number(url.searchParams.get('page'));
      const page = Number.isSafeInteger(requestedPage) ? Math.min(pageCount, Math.max(1, requestedPage)) : 1;
      const visitors = await env.DB.prepare('SELECT id, first_day, visit_count, last_seen FROM visitors ORDER BY first_day DESC, id ASC LIMIT ? OFFSET ?').bind(pageSize, (page - 1) * pageSize).all();
      return response(dashboardPage(total.count, today.count, daily.results, visitors.results, page, pageCount));
    } catch {
      return response('Service temporarily unavailable. Please try again later.', 503);
    }
  }
};
