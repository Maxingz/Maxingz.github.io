(() => {
  const cards = document.querySelectorAll('.contact-card');
  if (!cards.length) return;
  const status = document.createElement('span');
  status.className = 'contact-copy-status';
  status.setAttribute('role', 'status');
  document.querySelector('.contact-section').append(status);

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Support local previews where the Clipboard API may be unavailable.
    const field = document.createElement('textarea');
    const focused = document.activeElement;
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(field);
    try {
      field.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      field.remove();
      focused?.focus({ preventScroll: true });
    }
  }

  function makeButton(label, accessibleLabel, getText) {
    const icons = {
      copy: '<path d="M6.5 4.5H5a2.5 2.5 0 0 0-2.5 2.5v13A2.5 2.5 0 0 0 5 22.5h10a2.5 2.5 0 0 0 2.5-2.5v-1M9 1.5h7.5l5 5.5v9.5A2.5 2.5 0 0 1 19 19H9a2.5 2.5 0 0 1-2.5-2.5V4A2.5 2.5 0 0 1 9 1.5Z"/><path d="M16.5 1.5v3A2.5 2.5 0 0 0 19 7h2.5M11 10.5h6M11 14h6"/>',
      copied: '<path d="m5 12 4 4L19 6"/>',
      error: '<path d="M12 4v9m0 5v1"/>',
    };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'contact-copy-button';
    function showIcon(state, title) {
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[state]}</svg>`;
      button.title = title;
    }
    showIcon('copy', accessibleLabel);
    button.setAttribute('aria-label', accessibleLabel);
    let resetTimer;
    button.addEventListener('click', async () => {
      clearTimeout(resetTimer);
      button.disabled = true;
      status.textContent = '';
      try {
        await copyText(getText());
        showIcon('copied', 'Copied!');
        button.dataset.copied = 'true';
        status.textContent = `${accessibleLabel}: copied to clipboard.`;
      } catch {
        showIcon('error', 'Could not copy — click to retry');
        delete button.dataset.copied;
        status.textContent = 'Could not copy. Select the contact text and copy it manually.';
      } finally {
        button.disabled = false;
        resetTimer = setTimeout(() => {
          showIcon('copy', accessibleLabel);
          delete button.dataset.copied;
        }, 2000);
      }
    });
    return button;
  }

  for (const card of cards) {
    const title = card.querySelector('h2');
    const rows = [...card.querySelectorAll('.contact-details > div')].map(row => {
      const label = row.querySelector('dt').textContent.trim();
      const detail = row.querySelector('dd');
      const value = document.createElement('span');
      while (detail.firstChild) value.append(detail.firstChild);
      detail.append(value);
      const getValue = () => {
        const link = value.querySelector('a');
        if (link?.dataset.copyValue) return link.dataset.copyValue;
        return link?.getAttribute('href')?.startsWith('https://')
          ? link.href : value.textContent.trim();
      };
      detail.append(makeButton('Copy', `Copy ${label.toLowerCase()} for ${title.textContent.trim()}`, getValue));
      return { label, getValue };
    });
    const heading = document.createElement('div');
    heading.className = 'contact-card-heading';
    title.before(heading);
    heading.append(title, makeButton('Copy all', `Copy all details for ${title.textContent.trim()}`, () =>
      [title.textContent.trim(), ...rows.map(row => `${row.label}: ${row.getValue()}`)].join('\n')));
  }
})();
