# MG private visitor dashboard

The public website stays on GitHub Pages. This Worker serves the password form and authenticated dashboard on its own HTTPS origin. No private data or password is embedded in GitHub Pages. Tracking remains disabled until `WORKER_ORIGIN` in `../visitor-tracker.js` is configured.

## First deployment

Deployment progress (2026-11-26): the Worker is deployed at `https://mg-visitor-dashboard.awesomemax1000.workers.dev`. The `mg-visitors` D1 database and both tables are created, and DB, LOGIN_LIMIT and TRACK_LIMIT are bound. SITE_ORIGIN is configured and application request logs are disabled. The three private secrets, live login verification and public-site connection remain to be completed. Do not create another database when continuing this deployment.

Create a free Cloudflare account and install Node.js LTS (includes npm). From this folder:

1. Run `npx wrangler login` and complete the browser login.
2. Run `npx wrangler d1 create mg-visitors`. Copy the returned database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. Run `npx wrangler d1 migrations apply mg-visitors --remote`.
4. Run `npx wrangler deploy` to create the Worker. It returns 503 until secrets are configured.
5. Run each command below and enter values at Wrangler's hidden prompt, never in source code or chat:
   - `npx wrangler secret put ADMIN_PASSWORD` — a password-manager-generated random password, 24–256 characters.
   - `npx wrangler secret put SESSION_SECRET` — a separate random secret of at least 32 characters.
   - `npx wrangler secret put IP_HASH_SECRET` — another separate random secret of at least 32 characters.
6. Set `WORKER_ORIGIN` in `../visitor-tracker.js` to the reported `https://mg-visitor-dashboard.YOUR-SUBDOMAIN.workers.dev` URL, without a trailing slash. Refresh the script's cache-version URLs in the six main HTML pages and publish the site changes.
7. Visit the public site, click MG, sign in, confirm counts, then sign out. Confirm opening the Worker URL without a session shows only the password form.

Use the free Workers plan. No paid plan or custom domain is needed. Backend deployment is separate from pushing the public website to GitHub.

## Counting and privacy

- Counts are unique network IPs, not verified individual people. Shared networks, VPNs, changing addresses, bots, blockers and spoofed requests affect accuracy.
- The database stores a keyed HMAC of the Cloudflare-provided IP, first-seen UTC date, and daily membership. Raw IPs, browsing paths, referrers and user agents are not stored by this application. Cloudflare still processes request metadata as the hosting provider.
- The two tables retain these pseudonymous identifiers until deleted. To reset all history, delete rows from both `daily_visitors` and `visitors`. Changing the IP secret also makes returning visitors count as new.
- Tracking respects browser DNT/GPC signals. Local previews do not count. No tracking cookies or browser storage are used; only the dashboard uses a secure HttpOnly session cookie.
- Add an appropriate notice to your privacy information before enabling collection. Suggested text: “This site counts visits using a protected hash of your IP address. Raw IP addresses are not stored in our analytics database. Cloudflare processes requests for this service. Browser Do Not Track and Global Privacy Control signals are respected.”
- Login attempts are rate limited per IP hash, approximately per Cloudflare location. Use a strong random password. Rotate `SESSION_SECRET` to invalidate every session; changing only the password does not revoke existing sessions. Sessions expire after eight hours.
- Origin restrictions reduce accidental submissions; they are not authentication for tracking. Only authenticated requests receive dashboard counts. Logs are disabled in the Worker configuration; do not log requests, passwords, cookies or IPs when debugging.

## Checks

Run `node --test worker.test.mjs`. These cover authentication, tampered sessions, origin restrictions, rate limits and duplicate-IP counts with an in-memory database stub. Cloudflare D1 and end-to-end browser checks are still required after deployment.

References: [D1 setup](https://developers.cloudflare.com/d1/get-started/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
