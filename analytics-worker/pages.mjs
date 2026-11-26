import { pacificTime } from './time.mjs';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function shell(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MG · Visitor dashboard</title><style>
  *{box-sizing:border-box}body{margin:0;background:#fffaf5;color:#302720;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:8vh auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:16px}.logo{border:2px solid #e98137;border-radius:50%;padding:8px;color:#b94d0a;font-weight:800}h1{font-size:28px}label{display:block}input{display:block;width:100%;padding:12px;border:1px solid #b68b6a;border-radius:8px;font:inherit;margin:8px 0 18px}button{background:#ffead4;color:#713b16;border:1px solid #e98137;border-radius:8px;padding:10px 18px;font:inherit;cursor:pointer}a{color:#91430f}.counts{display:flex;flex-wrap:wrap;gap:32px}.counts strong{display:block;font-size:40px}.error{color:#a12820}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #dfcbbd}.note{color:#746456;font-size:14px}:focus-visible{outline:3px solid #c96220;outline-offset:3px}
  main:has(.counts){max-width:1440px;padding:32px 40px;margin:48px auto 80px}
  main:has(.counts) header{margin-bottom:40px}
  h2{margin:64px 0 20px}
  .counts{gap:40px 96px;margin:32px 0 56px}
  .note{line-height:1.8;margin:20px 0 28px;max-width:1000px}
  td,th{padding:20px 24px;vertical-align:top}
  nav{margin:24px 0 56px}
  .visitor-table-scroll{overflow-x:auto;margin-top:28px}
  .visitor-table{min-width:1180px;table-layout:fixed}
  .visitor-table th:nth-child(1){width:240px}
  .visitor-table th:nth-child(2){width:320px}
  .visitor-table th:nth-child(3){width:90px}
  .visitor-table th:nth-child(4),.visitor-table th:nth-child(5){width:265px}
  .visitor-table td:nth-child(2){overflow-wrap:anywhere}
  .visitor-id{display:block;overflow-wrap:anywhere;font-size:14px;line-height:1.7}
  @media(max-width:640px){main:has(.counts){padding:24px 16px;margin:16px auto 48px}.counts{gap:24px 40px}h2{margin-top:48px}td,th{padding:16px}}
  </style></head><body><main>${content}</main></body></html>`;
}
export function loginPage(error = '') {
  return shell(`<header><span class="logo">MG</span><a href="https://maxingz.github.io">Back to website</a></header><h1>Private visitor dashboard</h1><p>Enter your administrator password.</p>${error ? `<p role="alert" class="error">${escape(error)}</p>` : ''}<form action="/login" method="post"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required autofocus><button>Sign in</button></form>`);
}
function visitorTable(visitors, page, pageCount) {
  return `<h2>Individual visitors</h2><p class="note">Visitor IDs represent unique network IPs. IP addresses are linked when visitors return; older unlinked entries are shown as pending. Visits count tracked page loads, including refreshes. These visit counts started with this update; earlier page loads cannot be reconstructed. A zero means no tracked page loads since the update.</p><div class="visitor-table-scroll" tabindex="0" role="region" aria-label="Individual visitors table"><table class="visitor-table"><thead><tr><th>Visitor ID</th><th>IP address</th><th>Visits</th><th>First seen (PT)</th><th>Last visit (PT)</th></tr></thead><tbody>${visitors.map(visitor => `<tr><td><code class="visitor-id">${escape(visitor.id)}</code></td><td>${escape(visitor.ip_address || 'Pending next visit')}</td><td>${escape(visitor.visit_count)}</td><td>${escape(visitor.first_seen ? pacificTime(visitor.first_seen) : visitor.first_day + ' (legacy UTC date; time unknown)')}</td><td>${escape(pacificTime(visitor.last_seen))}</td></tr>`).join('') || '<tr><td colspan="5">No visitors recorded yet.</td></tr>'}</tbody></table></div><nav aria-label="Visitor pages">${page > 1 ? `<a href="/?page=${page - 1}">Previous</a> · ` : ''}Page ${page} of ${pageCount}${page < pageCount ? ` · <a href="/?page=${page + 1}">Next</a>` : ''}</nav>`;
}
export function dashboardPage(total, today, rows, visitors = [], page = 1, pageCount = 1) {
  return shell(`<header><span class="logo">MG</span><form action="/logout" method="post"><button>Sign out</button></form></header><h1>Visitors</h1><div class="counts"><div><strong>${escape(total)}</strong>Unique IPs since tracking began</div><div><strong>${escape(today)}</strong>Unique IPs today (PT)</div></div>${visitorTable(visitors, page, pageCount)}<h2>Recent days (Pacific Time)</h2><p class="note">Pacific daily counts begin with this update. Earlier UTC daily records remain stored but cannot be accurately converted without visit timestamps. Overall unique-IP totals are unchanged. Times automatically use PST or PDT.</p><table><thead><tr><th>Date (PT)</th><th>Unique IPs</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escape(row.day)}</td><td>${escape(row.count)}</td></tr>`).join('') || '<tr><td colspan="2">No visits recorded yet.</td></tr>'}</tbody></table><p class="note">One network address can represent several people, and changing networks can count one person again. Repeat visits from the same IP count once per day and once overall. Privacy signals and blockers may prevent counting. IP addresses are stored alongside visitor IDs and are only displayed after administrator login.</p><a href="/">Refresh counts</a>`);
}
