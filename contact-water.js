(() => {
  const page = document.querySelector('.contact-page');
  const canvas = page?.querySelector('.contact-water');
  const context = canvas?.getContext('2d');
  const effectsCanvas = page?.querySelector('.contact-water-effects');
  const effects = effectsCanvas?.getContext('2d');
  const header = document.querySelector('.site-header');
  if (!context || !effects) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...page.querySelectorAll('.contact-card')].map((element, index) => ({
    element, phase: index * 2.4, x: 0, y: 0, vx: 0, vy: 0, pointer: null,
    targetX: 0, targetY: 0, baseX: 0, baseY: 0, width: 0, height: 0,
    bubbleBudget: 0, wakeTime: 0,
  }));
  let width = 0, height = 0, waterline = 0, frame = null, lastTime = 0;
  let ceiling = 0;
  let water = [];
  const particles = [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function disturb(x, strength, spread = 65) {
    if (motion.matches) return;
    for (let i = 0; i < water.length; i++) {
      const distance = i * width / (water.length - 1) - x;
      water[i].v = clamp(water[i].v + strength * Math.exp(-distance * distance / (spread * spread)), -350, 350);
    }
  }

  function ripple(card) {
    disturb(card.baseX + card.x, 65);
    disturb(card.baseX + card.x + card.width, 65);
  }

  function updateCeiling() {
    ceiling = Math.max(0, (header?.getBoundingClientRect().bottom || 0) - page.getBoundingClientRect().top);
  }

  function waterStep(dt) {
    if (motion.matches || water.length < 2) return;
    const spacing = width / (water.length - 1);
    const propagation = Math.pow(170 / Math.max(spacing, 1), 2);
    // A damped spring chain carries impacts sideways and reflects them at the edges.
    const forces = water.map((point, i) => {
      const left = water[Math.max(0, i - 1)].y;
      const right = water[Math.min(water.length - 1, i + 1)].y;
      return propagation * (left + right - 2 * point.y) - point.y * 9 - point.v * 2.4;
    });
    water.forEach((point, i) => {
      point.v = clamp(point.v + forces[i] * dt, -350, 350);
      point.y = clamp(point.y + point.v * dt, -48, 48);
    });
  }

  function spawnParticle(x, y, bubble, vx = 0, vy = 0) {
    if (motion.matches || particles.length >= 180) return;
    particles.push({ x, y, bubble, vx, vy, age: 0,
      radius: bubble ? 1.5 + Math.random() * 3.5 : 1.5 + Math.random() * 2,
      life: bubble ? 3 + Math.random() * 2 : 1.1,
      phase: Math.random() * Math.PI * 2 });
  }

  function paintParticles(dt, time, surface) {
    effects.clearRect(0, 0, width, height);
    if (motion.matches) { particles.length = 0; return; }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      p.vx *= Math.exp(-dt * 1.4);
      p.vy += (p.bubble ? -55 : 520) * dt;
      p.vy = Math.max(p.vy, -115);
      p.x += (p.vx + (p.bubble ? Math.sin(time * 3 + p.phase) * 12 : 0)) * dt;
      p.y += p.vy * dt;
      const level = surface(clamp(p.x, 0, width));
      const hitSurface = p.bubble ? p.y - p.radius <= level : p.y >= level && p.vy > 0;
      if (hitSurface || p.age > p.life || p.x < 0 || p.x > width || p.y > height) {
        if (hitSurface) disturb(p.x, p.bubble ? -4 : 8, 16);
        particles.splice(i, 1);
        continue;
      }
      const alpha = Math.min(1, (p.life - p.age) * 2) * (p.bubble ? 0.65 : 0.75);
      effects.beginPath();
      effects.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      effects.fillStyle = `rgba(255, 231, 171, ${alpha * 0.45})`;
      effects.fill();
      effects.strokeStyle = `rgba(232, 111, 12, ${alpha})`;
      effects.lineWidth = 1;
      effects.stroke();
      if (p.bubble) {
        effects.beginPath();
        effects.arc(p.x - p.radius * 0.25, p.y - p.radius * 0.3, p.radius * 0.3, 0, Math.PI * 2);
        effects.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        effects.fill();
      }
    }
  }

  function paint(time, dt) {
    context.clearRect(0, 0, width, height);
    const surface = (x) => {
      if (motion.matches) return waterline;
      let y = waterline + Math.sin(x / 105 + time * 0.85) * 4 + Math.sin(x / 49 - time * 0.6) * 2;
      const position = clamp(x / width * (water.length - 1), 0, water.length - 1);
      const index = Math.floor(position);
      y += water[index].y + (water[Math.min(index + 1, water.length - 1)].y - water[index].y) * (position - index);
      return y;
    };
    context.beginPath();
    context.moveTo(0, surface(0));
    for (let x = 6; x < width; x += 6) context.lineTo(x, surface(x));
    context.lineTo(width, surface(width));
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    const fill = context.createLinearGradient(0, waterline, 0, height);
    fill.addColorStop(0, 'rgba(255, 174, 24, 0.62)');
    fill.addColorStop(0.4, 'rgba(255, 139, 12, 0.74)');
    fill.addColorStop(1, 'rgba(242, 102, 8, 0.84)');
    context.fillStyle = fill;
    context.fill();
    context.beginPath();
    context.moveTo(0, surface(0));
    for (let x = 6; x <= width + 6; x += 6) context.lineTo(Math.min(x, width), surface(Math.min(x, width)));
    context.strokeStyle = 'rgba(229, 112, 10, 0.8)';
    context.lineWidth = 1.5;
    context.stroke();
    paintParticles(dt, time, surface);
  }

  function renderCard(card) {
    card.element.style.setProperty('--float-x', `${card.x}px`);
    card.element.style.setProperty('--float-y', `${card.y}px`);
  }

  function contain(card) {
    const minX = 8 - card.baseX;
    const maxX = width - 8 - card.width - card.baseX;
    const minY = ceiling - card.baseY;
    const maxY = height - 12 - card.height - card.baseY;
    if (card.x < minX || card.x > maxX) {
      card.x = clamp(card.x, minX, maxX);
      if ((card.x === minX && card.vx < 0) || (card.x === maxX && card.vx > 0)) card.vx *= -0.35;
    }
    if (card.y < minY || card.y > maxY) {
      card.y = clamp(card.y, minY, maxY);
      if ((card.y === minY && card.vy < 0) || (card.y === maxY && card.vy > 0)) card.vy *= -0.25;
    }
  }

  function collide() {
    // Keep cards axis-aligned so visible edges and collision bounds agree.
    // Repeat the solver to handle a card being pushed against a page edge.
    for (let pass = 0; pass < 12; pass++) {
      cards.forEach(contain);
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const a = cards[i], b = cards[j];
          const dx = b.baseX + b.x + b.width / 2 - (a.baseX + a.x + a.width / 2);
          const dy = b.baseY + b.y + b.height / 2 - (a.baseY + a.y + a.height / 2);
          const overlapX = (a.width + b.width) / 2 + 2 - Math.abs(dx);
          const overlapY = (a.height + b.height) / 2 + 2 - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          const horizontal = overlapX < overlapY;
          const axis = horizontal ? 'x' : 'y';
          const velocity = horizontal ? 'vx' : 'vy';
          const sign = (horizontal ? dx : dy) >= 0 ? 1 : -1;
          const overlap = horizontal ? overlapX : overlapY;
          // A held card can push its neighbor, but cannot crush it against a wall.
          const massA = a.pointer === null ? 1 : 0.5;
          const massB = b.pointer === null ? 1 : 0.5;
          const total = massA + massB;
          a[axis] -= sign * overlap * massA / total;
          b[axis] += sign * overlap * massB / total;
          const closing = (b[velocity] - a[velocity]) * sign;
          if (closing < 0) {
            const impulse = -1.25 * closing / total;
            a[velocity] -= impulse * sign * massA;
            b[velocity] += impulse * sign * massB;
          }
        }
      }
    }
    cards.forEach(contain);
  }

  function step(dt, time) {
    for (const card of cards) {
      card.previousX = card.x;
      card.previousY = card.y;
      if (card.pointer !== null) {
        // Small bounded steps prevent fast drags from tunneling through a card.
        card.vx = clamp((card.targetX - card.x) / dt, -1100, 1100);
        card.vy = clamp((card.targetY - card.y) / dt, -1100, 1100);
      } else if (motion.matches) {
        card.vx = card.vy = 0;
      } else {
        const target = Math.sin(time * 1.25 + card.phase) * 3;
        const submerged = clamp((card.baseY + card.y + card.height - waterline) / card.height, 0, 1);
        // Stronger, underdamped buoyancy launches a depressed card past its resting
        // depth. Keep the same target so it settles at the original equilibrium.
        const springStrength = card.y > target ? 105 : 42;
        const acceleration = (target - card.y) * springStrength * submerged + 230 * (1 - submerged);
        // Absorb more energy on the downward return without weakening the upward launch.
        const waterDamping = card.vy > 0 ? 6 : 0.85;
        const drag = card.vy * (0.25 + submerged * waterDamping) + submerged * 0.00025 * card.vy * Math.abs(card.vy);
        card.vy += (acceleration - drag) * dt;
        card.vx *= Math.exp(-(0.2 + submerged * 1.4) * dt);
      }
      card.x += card.vx * dt;
      card.y += card.vy * dt;
    }
    collide();
    if (!motion.matches) {
      for (const card of cards) {
        const dx = card.x - card.previousX, dy = card.y - card.previousY;
        const speed = Math.hypot(dx, dy) / dt;
        const left = card.baseX + card.x;
        const top = card.baseY + card.y;
        const bottom = top + card.height;
        const wet = clamp((bottom - waterline) / card.height, 0, 1);
        card.wakeTime += dt;
        // Surface crossings displace more water; underwater motion leaves a softer wake.
        if (speed > 25 && wet > 0 && card.wakeTime > 0.065) {
          const nearSurface = Math.exp(-Math.max(0, top - waterline) / 160);
          const strength = clamp((dy / dt * 0.24 + Math.abs(dx / dt) * 0.08) * nearSurface, -115, 115);
          disturb(left, strength, 45);
          disturb(left + card.width, strength, 45);
          card.wakeTime = 0;
        }
        for (const edge of [top, bottom]) {
          if ((edge - waterline) * (edge - dy - waterline) < 0 && speed > 35) {
            for (const x of [left, left + card.width]) {
              disturb(x, clamp(dy / dt * 0.5, -180, 180));
              for (let n = 0; n < 7; n++) {
                spawnParticle(x + (Math.random() - 0.5) * 28, waterline - 5, false,
                  (Math.random() - 0.5) * 160, -80 - Math.random() * Math.min(speed, 240));
              }
            }
          }
        }
        if (wet > 0 && speed > 22) {
          card.bubbleBudget = Math.min(8, card.bubbleBudget + Math.min(speed / 12, 55) * wet * dt);
          while (card.bubbleBudget >= 1) {
            const x = Math.random() < 0.5 ? left - 3 - Math.random() * 12 : left + card.width + 3 + Math.random() * 12;
            const y = Math.max(waterline + 10, top) + Math.random() * Math.max(1, bottom - Math.max(waterline + 10, top));
            spawnParticle(x, y, true, dx / dt * 0.12, -15 - Math.random() * 35);
            card.bubbleBudget--;
          }
        }
      }
    }
    waterStep(dt);
  }

  function tick(now) {
    frame = null;
    const dt = Math.min((now - (lastTime || now - 16.67)) / 1000, 1 / 30);
    lastTime = now;
    const time = now / 1000;
    updateCeiling();
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) step(dt / steps, time);
    cards.forEach(renderCard);
    paint(time, dt);
    if ((!motion.matches || cards.some(card => card.pointer !== null)) && !document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (frame === null && !document.hidden) {
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function measure() {
    const bounds = page.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const group = page.querySelector('.contact-cards').getBoundingClientRect();
    const heading = page.querySelector('.contact-heading').getBoundingClientRect();
    waterline = (heading.bottom + group.top) / 2 - bounds.top;
    water = Array.from({ length: Math.max(2, Math.ceil(width / 16) + 1) }, () => ({ y: 0, v: 0 }));
    particles.length = 0;
    updateCeiling();
    for (const card of cards) {
      const rect = card.element.getBoundingClientRect();
      card.baseX = rect.left - bounds.left - card.x;
      card.baseY = rect.top - bounds.top - card.y;
      card.width = rect.width;
      card.height = rect.height;
      card.vx = card.vy = 0;
    }
    collide();
    cards.forEach(renderCard);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    effectsCanvas.width = canvas.width;
    effectsCanvas.height = canvas.height;
    effects.setTransform(dpr, 0, 0, dpr, 0, 0);
    start();
  }

  function release(card) {
    if (card.pointer === null) return;
    const pointer = card.pointer;
    card.pointer = null;
    if (motion.matches) card.vx = card.vy = 0;
    card.element.classList.remove('is-dragging');
    if (card.element.hasPointerCapture(pointer)) card.element.releasePointerCapture(pointer);
    ripple(card);
    start();
  }

  for (const card of cards) {
    card.element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || card.pointer !== null || event.target.closest('a, button')) return;
      card.pointer = event.pointerId;
      const bounds = page.getBoundingClientRect();
      card.grabX = event.clientX - bounds.left - card.baseX - card.x;
      card.grabY = event.clientY - bounds.top - card.baseY - card.y;
      card.targetX = card.x;
      card.targetY = card.y;
      card.vx = card.vy = 0;
      card.element.setPointerCapture(event.pointerId);
      card.element.classList.add('is-dragging');
      card.element.focus({ preventScroll: true });
      start();
    });
    card.element.addEventListener('pointermove', (event) => {
      if (card.pointer !== event.pointerId) return;
      const bounds = page.getBoundingClientRect();
      card.targetX = event.clientX - bounds.left - card.baseX - card.grabX;
      card.targetY = event.clientY - bounds.top - card.baseY - card.grabY;
      start();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      card.element.addEventListener(name, (event) => {
        if (event.pointerId === card.pointer) release(card);
      });
    }
    card.element.addEventListener('keydown', (event) => {
      if (event.target !== card.element || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const axis = ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 'x' : 'y';
      const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
      // Resolve each small move so keyboard input obeys the same collision rules.
      for (let i = 0; i < 8; i++) {
        card[axis] += direction * 5;
        collide();
      }
      cards.forEach(renderCard);
      ripple(card);
      start();
    });
  }
  window.addEventListener('blur', () => cards.forEach(release));
  window.addEventListener('scroll', start, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') cards.forEach(release);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cards.forEach(release);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    } else start();
  });
  motion.addEventListener('change', start);
  new ResizeObserver(measure).observe(page);
  measure();
})();
