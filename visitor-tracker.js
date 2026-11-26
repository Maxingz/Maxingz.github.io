(() => {
  // Public endpoint only. Passwords and signing secrets belong in Cloudflare secrets.
  const WORKER_ORIGIN = 'https://mg-visitor-dashboard.awesomemax1000.workers.dev';
  const header = document.querySelector('.header-inner');
  if (header) {
    const logo = document.createElement('a');
    logo.className = 'mg-dashboard-link';
    logo.textContent = 'MG';
    logo.setAttribute('aria-label', 'MG private visitor dashboard');
    logo.href = WORKER_ORIGIN || '#';
    if (!WORKER_ORIGIN) logo.addEventListener('click', event => {
      event.preventDefault();
      const notice = document.createElement('dialog');
      notice.className = 'mg-setup-notice';
      const message = document.createElement('p');
      message.textContent = 'The private dashboard is not connected yet.';
      const close = document.createElement('button');
      close.textContent = 'Close';
      close.addEventListener('click', () => notice.close());
      notice.addEventListener('close', () => notice.remove());
      notice.append(message, close);
      document.body.append(notice);
      notice.showModal();
    });
    header.append(logo);
  }
  if (!WORKER_ORIGIN || location.origin !== 'https://maxingz.github.io' ||
      navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  // Database uniqueness, not a browser cookie, deduplicates repeat visitors.
  fetch(WORKER_ORIGIN + '/track', { method: 'POST', credentials: 'omit', keepalive: true }).catch(() => {});
})();
