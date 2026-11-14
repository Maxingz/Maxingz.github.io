(() => {
  const scene = document.querySelector('.happiness-scene');
  if (!scene) return;
  const beam = scene.querySelector('.happiness-beam'), slider = scene.querySelector('.happiness-slider'), value = scene.querySelector('.happiness-value');
  const status = document.querySelector('.happiness-result'), cards = [...document.querySelectorAll('.activity-card')];
  const discoveryKey = 'interests-discovered-activities-v1';
  let discovered = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(discoveryKey) || '[]');
    if (Array.isArray(saved)) discovered = new Set(saved.filter(name => typeof name === 'string'));
  } catch { /* Keep the page usable if storage is unavailable or contains invalid data. */ }
  cards.forEach(card => card.classList.toggle('is-discovered', discovered.has(card.dataset.name)));
  function revealActivity(card) {
    card.classList.add('is-discovered');
    discovered.add(card.dataset.name);
    try { localStorage.setItem(discoveryKey, JSON.stringify([...discovered])); } catch {}
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), header = document.querySelector('.site-header');
  const detailPanels = [...document.querySelectorAll('.hobby-detail-panel')];
  function showDetails(card) {
    const notes = document.querySelector('.hobby-notes');
    const info = card.querySelector('.activity-info');
    notes.replaceChildren();
    if (info) notes.append(info.content.cloneNode(true));
    document.querySelector('.hobby-detail-interest').textContent = card.querySelector('.activity-rating').textContent.replace(/^Interest:\s*/i, '');
    document.querySelector('.hobby-detail-skill').textContent = card.querySelector('.activity-skill').textContent.replace(/^Skill:\s*/i, '');
    detailPanels.forEach(panel => {
      panel.classList.add('is-visible'); panel.setAttribute('aria-hidden', 'false');
      if (!motion.matches && panel.animate) {
        panel.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
        let line = 0;
        // Measure wrapped text so each visible line fades together, as on Projects.
        for (const block of panel.querySelectorAll('h3, h4, p')) {
          const text = block.textContent;
          block.replaceChildren();
          const words = [];
          for (const token of text.match(/\s+|\S+/g) || []) {
            if (/^\s+$/.test(token)) block.append(document.createTextNode(token));
            else {
              const word = document.createElement('span'); word.textContent = token;
              block.append(word); words.push(word);
            }
          }
          let top = null;
          for (const word of words) {
            const y = word.getBoundingClientRect().top;
            if (top !== null && Math.abs(y - top) > 2) line++;
            top = y;
            word.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: line * 130, easing: 'ease', fill: 'backwards' });
          }
          if (words.length) line++;
        }
      }
    });
  }
  function hideDetails() {
    detailPanels.forEach(panel => { panel.classList.remove('is-visible'); panel.setAttribute('aria-hidden', 'true'); });
  }
  const updateHeader = () => document.documentElement.style.setProperty('--interests-header-height', `${header?.getBoundingClientRect().height || 0}px`);
  updateHeader();
  if (header && 'ResizeObserver' in window) new ResizeObserver(updateHeader).observe(header);
  function svg(tag, attrs) {
    const el = document.createElementNS(scene.namespaceURI, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
  const box = svg('g', { class: 'happiness-activity-box', tabindex: 0, role: 'button' });
  box.append(svg('rect', { x: -40, y: -33, width: 80, height: 66, rx: 4, fill: '#ffe0bc', stroke: '#d77526', 'stroke-width': 3 }));
  const picture = svg('image', { x: -37, y: -30, width: 74, height: 60, preserveAspectRatio: 'xMidYMid slice' });
  box.append(picture); scene.append(box); box.style.display = 'none';
  const front = svg('g', { 'pointer-events': 'none', 'aria-hidden': true });
  const basketArt = svg('svg', { x: 715, y: 55, width: 210, height: 83, viewBox: '15 108 1504 748', preserveAspectRatio: 'none', overflow: 'hidden' });
  basketArt.append(svg('image', { href: 'assets/interests/basket-body.png', width: 1536, height: 1024 }));
  front.append(basketArt);
  scene.append(front);
  const sliderFront = svg('g', { 'pointer-events': 'none' });
  sliderFront.append(slider);
  scene.append(sliderFront);
  const swimming = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 66"><rect width="80" height="66" fill="#aad9e4"/><path d="M0 25 Q10 15 20 25 T40 25 T60 25 T80 25 M0 45 Q10 35 20 45 T40 45 T60 45 T80 45" fill="none" stroke="#3d8293" stroke-width="5"/></svg>');
  const imageFor = card => card.querySelector('img')?.getAttribute('src') || swimming;
  let angle = 0, angularSpeed = 0, targetAngle = 0, position = 500, slideSpeed = 0, targetPosition = 500;
  let body = null, drag = null, frame = null, lastTime = 0, suppressClick = false;
  const rad = () => angle * Math.PI / 180;
  function local(x, y) {
    const c = Math.cos(rad()), s = Math.sin(rad());
    return { x: 500 + (x - 500) * c + (y - 179) * s, y: 179 - (x - 500) * s + (y - 179) * c };
  }
  function world(x, y) {
    const c = Math.cos(rad()), s = Math.sin(rad());
    return { x: 500 + (x - 500) * c - (y - 179) * s, y: 179 + (x - 500) * s + (y - 179) * c };
  }
  function fromScreen(x, y) {
    const point = scene.createSVGPoint(); point.x = x; point.y = y;
    return point.matrixTransform(scene.getScreenCTM().inverse());
  }
  function clearRating() {
    hideDetails();
    targetAngle = 0; targetPosition = 500; value.textContent = '–';
    cards.forEach(card => card.setAttribute('aria-pressed', 'false'));
    status.textContent = '';
    scene.setAttribute('aria-label', 'Happiness seesaw with an empty basket.');
  }
  function select(card) {
    revealActivity(card);
    showDetails(card);
    const rating = Number(card.dataset.rating);
    targetAngle = (rating - 5.5) * (14 / 4.5); targetPosition = 104 + (rating - 1) * 88; value.textContent = rating;
    cards.forEach(item => item.setAttribute('aria-pressed', String(item === card)));
    status.textContent = `${card.dataset.name} · ${card.querySelector('.activity-rating').textContent} · Grab the image to toss it away.`;
    scene.setAttribute('aria-label', `${card.dataset.name}: happiness ${rating} out of 10.`);
  }
  function stepBody(dt) {
    if (!body) return;
    if (body.inside) {
      // Gravity and collisions remain active inside the moving basket.
      body.vx += 1000 * Math.sin(rad()) * dt; body.vy += 1000 * Math.cos(rad()) * dt;
      body.x += body.vx * dt; body.y += body.vy * dt;
      if (body.x < 766) { body.x = 766; body.vx = Math.abs(body.vx) * 0.28; }
      if (body.x > 874) { body.x = 874; body.vx = -Math.abs(body.vx) * 0.28; }
      if (body.y > 101) {
        body.y = 101; body.vy = Math.abs(body.vy) < 35 ? 0 : -Math.abs(body.vy) * 0.25;
        body.vx *= Math.exp(-12 * dt);
        if (Math.abs(body.vx) < 2.5) body.vx = 0;
      }
      return;
    }
    const old = local(body.x, body.y);
    body.vy += 1000 * dt; body.x += body.vx * dt; body.y += body.vy * dt;
    const p = local(body.x, body.y);
    if (p.x >= 690 && p.x <= 950 && old.y <= 88 && p.y >= 22 && body.vy > 0) {
      const c = Math.cos(rad()), s = Math.sin(rad());
      const vx = body.vx * c + body.vy * s, vy = -body.vx * s + body.vy * c;
      Object.assign(body, { x: Math.max(766, Math.min(874, p.x)), y: p.y, vx, vy, inside: true });
      select(body.card); angularSpeed += Math.min(7, Math.abs(vy) * 0.01);
    } else if (body.y > 600) { body = null; box.style.display = 'none'; }
  }
  function draw() {
    const transform = `rotate(${angle} 500 179)`;
    beam.setAttribute('transform', transform); front.setAttribute('transform', transform);
    sliderFront.setAttribute('transform', transform);
    slider.setAttribute('transform', `translate(${position} 0)`);
    if (body) {
      const p = body.inside ? world(body.x, body.y) : body;
      box.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${body.inside ? angle : 0})`);
    }
    updateHintPointers();
  }
  function tick(time) {
    const elapsed = Math.min((time - lastTime) / 1000, 0.05); lastTime = time;
    const steps = Math.max(1, Math.ceil(elapsed * 120)), dt = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      angularSpeed += ((targetAngle - angle) * 45 - angularSpeed * 9) * dt; angle += angularSpeed * dt;
      slideSpeed += ((targetPosition - position) * 24 - slideSpeed * 8) * dt; position += slideSpeed * dt;
      stepBody(dt);
    }
    draw();
    const still = !body || (body.inside && body.y >= 100.9 && Math.abs(body.vx) + Math.abs(body.vy) < 3);
    if (still && Math.abs(angle - targetAngle) + Math.abs(angularSpeed) < 0.01 && Math.abs(position - targetPosition) + Math.abs(slideSpeed) < 0.05) frame = null;
    else frame = requestAnimationFrame(tick);
  }
  function animate() {
    if (motion.matches) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; angle = targetAngle; position = targetPosition; angularSpeed = slideSpeed = 0;
      if (body) Object.assign(body, { inside: true, x: 820, y: 101, vx: 0, vy: 0 });
      draw();
    } else if (frame === null) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function drop(card, p = world(820, -15), velocity = { x: 0, y: 0 }) {
    clearRating(); body = { card, x: p.x, y: p.y, vx: velocity.x, vy: velocity.y, inside: false };
    picture.setAttribute('href', imageFor(card));
    box.setAttribute('aria-label', `${card.dataset.name}. Drag to remove, or press Delete to discard.`);
    box.style.display = '';
    if (motion.matches) select(card);
    animate();
  }
  function ghostFor(card) {
    const ghost = document.createElement('div'); ghost.className = 'activity-image-ghost';
    const img = document.createElement('img'); img.src = imageFor(card); img.alt = card.dataset.name; img.draggable = false;
    ghost.append(img); document.body.append(ghost);
    const scale = scene.getScreenCTM().a;
    ghost.style.width = `${80 * scale}px`; ghost.style.height = `${66 * scale}px`;
    return ghost;
  }
  function toss(ghost, x, y, vx, vy) {
    if (motion.matches) { ghost.remove(); return; }
    let previous = performance.now();
    function fall(time) {
      const dt = Math.min((time - previous) / 1000, 0.04); previous = time;
      vy += 1500 * dt; x += vx * dt; y += vy * dt;
      ghost.style.left = `${x}px`; ghost.style.top = `${y}px`;
      if (y < innerHeight + 180) requestAnimationFrame(fall); else ghost.remove();
    }
    requestAnimationFrame(fall);
  }
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    if (!drag.active) { drag.active = true; drag.ghost = ghostFor(drag.card); drag.source.classList.add('is-dragging'); }
    const elapsed = Math.max(0.008, (performance.now() - drag.time) / 1000);
    drag.vx = Math.max(-1400, Math.min(1400, (event.clientX - drag.x) / elapsed));
    drag.vy = Math.max(-1400, Math.min(1400, (event.clientY - drag.y) / elapsed));
    drag.x = event.clientX; drag.y = event.clientY; drag.time = performance.now();
    drag.ghost.style.left = `${drag.x}px`; drag.ghost.style.top = `${drag.y}px`;
  }
  function end(event, cancelled = false) {
    if (!drag || drag.id !== event.pointerId) return;
    const held = drag; drag = null;
    if (held.active) {
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      const point = fromScreen(held.x, held.y), p = local(point.x, point.y);
      const recent = performance.now() - held.time < 100;
      if (!cancelled && p.x >= 690 && p.x <= 950 && p.y < 110 && p.y > -600) {
        const scale = scene.getScreenCTM().a;
        drop(held.card, point, { x: recent ? held.vx / scale : 0, y: recent ? held.vy / scale : 0 }); held.ghost.remove();
      } else if (cancelled) held.ghost.remove();
      else toss(held.ghost, held.x, held.y, recent ? held.vx : 0, recent ? held.vy : 0);
    }
    held.source.classList.remove('is-dragging');
    if (held.source.hasPointerCapture(held.id)) held.source.releasePointerCapture(held.id);
  }
  function bind(source, getCard, fromBasket = false) {
    source.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag || !getCard()) return;
      const card = getCard();
      drag = { id: event.pointerId, card, source, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, time: performance.now(), vx: 0, vy: 0, active: fromBasket };
      if (fromBasket) {
        drag.ghost = ghostFor(card); drag.ghost.style.left = `${drag.x}px`; drag.ghost.style.top = `${drag.y}px`;
        body = null; box.style.display = 'none'; clearRating(); animate();
      }
      source.setPointerCapture(event.pointerId);
    });
    source.addEventListener('pointermove', move);
    source.addEventListener('pointerup', event => end(event));
    source.addEventListener('pointercancel', event => end(event, true));
    source.addEventListener('lostpointercapture', event => end(event, true));
  }
  cards.forEach(card => { bind(card, () => card); card.addEventListener('click', () => { if (!suppressClick) drop(card); }); });
  bind(box, () => body?.card, true);
  box.addEventListener('keydown', event => {
    if (body && ['Delete', 'Backspace', 'Enter', ' '].includes(event.key)) {
      event.preventDefault(); const card = body.card; const bounds = box.getBoundingClientRect();
      const ghost = ghostFor(card); body = null; box.style.display = 'none';
      toss(ghost, bounds.left + bounds.width / 2, bounds.top, -240, -100); clearRating(); animate(); card.focus();
    }
  });
  const hintButton = document.querySelector('.happiness-hint-button');
  const hints = document.querySelector('.happiness-hints');
  const hintCards = [...hints.querySelectorAll('.happiness-hint')];
  const firstTip = document.querySelector('.activity-first-tip');
  document.querySelector('.activity-tip-dismiss')?.addEventListener('click', () => {
    if (!firstTip) return;
    firstTip.hidden = true;
    syncHints();
    cards[0].focus({ preventScroll: true });
  });
  const station = document.querySelector('.happiness-station');
  station.insertBefore(hints, station.querySelector('.happiness-heading'));
  const pointers = svg('svg', { class: 'happiness-hint-pointers', 'aria-hidden': 'true' });
  const mask = svg('mask', { id: 'happiness-pointer-mask', maskUnits: 'userSpaceOnUse', x: -5000, y: -5000, width: 10000, height: 10000 });
  mask.append(svg('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: 'white' }));
  const cutouts = hintCards.map(() => { const rect = svg('rect', { fill: 'black', rx: 10 }); mask.append(rect); return rect; });
  const defs = svg('defs', {}); defs.append(mask); pointers.append(defs);
  const pointerPaths = hintCards.map(() => {
    const path = svg('path', { fill: '#df985c', 'fill-opacity': 0.38, mask: 'url(#happiness-pointer-mask)' });
    pointers.append(path); return path;
  });
  station.append(pointers);
  const hintTargets = [document.querySelector('#happiness-title'), slider, scene.querySelector('.happiness-target-hint')];
  function updateHintPointers() {
    if (hints.hidden) return;
    const bounds = station.getBoundingClientRect();
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const below = bounds.top - hints.offsetHeight - 16 < headerBottom + 8;
    hints.classList.toggle('hints-below', below);
    pointers.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    hintCards.forEach((hint, i) => {
      pointerPaths[i].style.display = hint.hidden ? 'none' : '';
      cutouts[i].setAttribute('width', 0);
      if (hint.hidden) return;
      const card = hint.getBoundingClientRect(), target = hintTargets[i].getBoundingClientRect();
      for (const [key, val] of Object.entries({ x: card.left - bounds.left + 1, y: card.top - bounds.top + 1, width: card.width - 2, height: card.height - 2 })) cutouts[i].setAttribute(key, val);
      const targetX = i === 0
        ? (card.left + card.width / 2 < target.left + target.width / 2 ? target.left : target.right)
        : target.left + target.width / 2;
      const tx = targetX - bounds.left;
      const ty = (below ? target.bottom + 5 : target.top - 5) - bounds.top;
      const x = Math.max(card.left - bounds.left + 20, Math.min(card.right - bounds.left - 20, tx));
      const y = (below ? card.top + 14 : card.bottom - 14) - bounds.top;
      // Measure the spike width perpendicular to its direction, not horizontally.
      const distance = Math.hypot(tx - x, ty - y) || 1;
      const nx = -(ty - y) / distance * 9, ny = (tx - x) / distance * 9;
      pointerPaths[i].setAttribute('d', `M${x + nx} ${y + ny} L${tx} ${ty} L${x - nx} ${y - ny} Z`);
    });
  }
  function syncHints() {
    const mainVisible = hintCards.some(hint => !hint.hidden);
    const visible = mainVisible || Boolean(firstTip && !firstTip.hidden);
    hints.hidden = !mainVisible;
    hintButton.setAttribute('aria-expanded', String(visible));
    hintButton.setAttribute('aria-label', visible ? 'Hide seesaw hints' : 'Show seesaw hints');
    pointers.style.display = mainVisible ? '' : 'none';
    station.classList.toggle('show-drop-hint', !hints.querySelector('[data-drop-hint]').hidden);
    updateHintPointers();
  }
  hints.addEventListener('click', event => {
    const button = event.target.closest('.hint-dismiss');
    if (!button) return;
    button.closest('.happiness-hint').hidden = true;
    syncHints();
    hintButton.focus({ preventScroll: true });
  });
  hintButton.addEventListener('click', () => {
    const hide = hintCards.some(hint => !hint.hidden) || Boolean(firstTip && !firstTip.hidden);
    if (firstTip) firstTip.hidden = hide;
    hintCards.forEach(hint => { hint.hidden = hide; });
    syncHints();
  });
  let seen = false;
  try {
    seen = localStorage.getItem('interests-hints-seen-v1') === 'true';
    localStorage.setItem('interests-hints-seen-v1', 'true');
  } catch {
    // Restricted browsers may allow session storage even when local storage is disabled.
    try { seen = sessionStorage.getItem('interests-hints-seen-v1') === 'true'; sessionStorage.setItem('interests-hints-seen-v1', 'true'); } catch {}
  }
  hintCards.forEach(hint => { hint.hidden = seen; });
  if (firstTip) firstTip.hidden = seen;
  syncHints();
  window.addEventListener('resize', updateHintPointers);
  window.addEventListener('scroll', updateHintPointers, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(updateHintPointers).observe(station);
  document.fonts?.ready.then(updateHintPointers);
  motion.addEventListener('change', () => { if (body && motion.matches) select(body.card); animate(); });
  draw();
})();
