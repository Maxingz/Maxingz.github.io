(() => {
  const rope = document.querySelector('.project-rope');
  if (!rope) return;
  const links = [...rope.querySelectorAll('a')];
  if (!links.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('project-rope-strands');
  svg.setAttribute('aria-hidden', 'true');
  const paths = ['rope-shadow', 'rope-core', 'rope-twist', 'rope-hit'].map(name => {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('class', name);
    svg.append(path);
    return path;
  });
  const endCap = document.createElementNS(svg.namespaceURI, 'g');
  endCap.classList.add('rope-end-cap');
  // A tapered cap covers the rope end, leaving a short twisted tail below.
  for (const [name, d] of [
    ['rope-core', 'M0 0 L0 23'],
    ['rope-twist', 'M0 0 L0 23'],
    ['rope-cap-shell', 'M-8 -12 L8 -12 L13 8 L-13 8 Z'],
    ['rope-cap-highlight', 'M-5 -8 L5 -8']
  ]) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('class', name);
    path.setAttribute('d', d);
    endCap.append(path);
  }
  svg.append(endCap);
  rope.prepend(svg);
  rope.classList.add('has-physics');
  const count = 36;
  const dt = 1 / 120;
  let points = [], attachments = [], length = 0, center = 0;
  let boxSwings = [];
  let frame = null, previous = 0, accumulator = 0, quiet = 0;
  let drag = null;
  const hit = paths[3];

  function wake() {
    quiet = 0;
    if (frame === null) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function moveDrag(event) {
    const bounds = rope.getBoundingClientRect();
    let x = event.clientX - bounds.left + drag.offsetX;
    let y = Math.max(0, event.clientY - bounds.top + drag.offsetY);
    const reach = drag.reach;
    const distance = Math.hypot(x - center, y);
    if (distance > reach) { x = center + (x - center) * reach / distance; y *= reach / distance; }
    drag.x = Math.max(-bounds.left + center + 8, Math.min(innerWidth - bounds.left - center - 8, x));
    drag.y = y;
  }
  hit.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    const bounds = rope.getBoundingClientRect();
    const cursorX = event.clientX - bounds.left, cursorY = event.clientY - bounds.top;
    let closest = Infinity;
    // Project onto every segment, retaining the exact fractional grab position.
    for (let i = 0; i < count; i++) {
      const a = points[i], b = points[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const fraction = Math.max(0, Math.min(1,
        ((cursorX - a.x) * dx + (cursorY - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const x = a.x + dx * fraction, y = a.y + dy * fraction;
      const distance = Math.hypot(x - cursorX, y - cursorY);
      if (distance < closest) {
        closest = distance;
        drag = { index: i, fraction, x, y, pointerId: event.pointerId,
          offsetX: x - cursorX, offsetY: y - cursorY,
          reach: Math.max((i + fraction) * length * 1.015, Math.hypot(x - center, y)) };
      }
    }
    hit.setPointerCapture(event.pointerId);
    rope.classList.add('is-dragging');
    wake();
  });
  hit.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    moveDrag(event);
  });
  function release() {
    if (!drag) return;
    const { pointerId } = drag;
    drag = null;
    rope.classList.remove('is-dragging');
    if (hit.hasPointerCapture(pointerId)) hit.releasePointerCapture(pointerId);
    if (motion.matches) reset();
    else wake();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) hit.addEventListener(type, release);

  function attachmentPoint(i) {
    const index = Math.min(count - 1, Math.floor(attachments[i]));
    const fraction = attachments[i] - index;
    const a = points[index], b = points[index + 1];
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  }

  function stepBoxes() {
    boxSwings.forEach((swing, i) => {
      const pivot = attachmentPoint(i);
      const vx = (pivot.x - swing.x) / dt;
      const vy = (pivot.y - swing.y) / dt;
      // Smooth solver impulses while retaining the inertia of a freely hung sign.
      const ax = Math.max(-6000, Math.min(6000, (vx - swing.vx) / dt));
      const ay = Math.max(-6000, Math.min(6000, (vy - swing.vy) / dt));
      swing.ax += (ax - swing.ax) * 0.18;
      swing.ay += (ay - swing.ay) * 0.18;
      const torque = (swing.ax * Math.cos(swing.angle)
        - (1600 - swing.ay) * Math.sin(swing.angle)) / swing.pendulumLength;
      swing.velocity = (swing.velocity + torque * dt) * Math.exp(-1.8 * dt);
      swing.angle += swing.velocity * dt;
      swing.x = pivot.x;
      swing.y = pivot.y;
      swing.vx = vx;
      swing.vy = vy;
    });
  }

  function render() {
    const d = points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
    paths.forEach(path => path.setAttribute('d', d));
    const end = points[count], beforeEnd = points[count - 1];
    const endAngle = -Math.atan2(end.x - beforeEnd.x, end.y - beforeEnd.y) * 180 / Math.PI;
    endCap.setAttribute('transform', `translate(${end.x},${end.y}) rotate(${endAngle})`);
    links.forEach((link, i) => {
      const point = attachmentPoint(i);
      const angle = boxSwings[i].angle * 180 / Math.PI;
      link.style.left = `${point.x}px`;
      // The dot is centered on the top border, which is also the rotation pivot.
      link.style.top = `${point.y}px`;
      link.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    });
  }

  function step() {
    const left = rope.getBoundingClientRect().left;
    for (let i = 1; i <= count; i++) {
      const p = points[i];
      const vx = (p.x - p.oldX) * 0.994;
      const vy = (p.y - p.oldY) * 0.994;
      p.oldX = p.x;
      p.oldY = p.y;
      p.x += vx;
      p.y += vy + 1600 * dt * dt;
    }
    // Distance constraints transmit tension along the chain; signs add mass.
    for (let pass = 0; pass < 24; pass++) {
      points[0].x = center;
      points[0].y = 0;
      for (let i = 1; i <= count; i++) {
        const a = points[i - 1], b = points[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const correction = (distance - length) / distance;
        const total = a.weight + b.weight;
        if (!total) continue;
        a.x += dx * correction * a.weight / total;
        a.y += dy * correction * a.weight / total;
        b.x -= dx * correction * b.weight / total;
        b.y -= dy * correction * b.weight / total;
      }
      // Let the rope swing freely across the page, but keep signs on screen.
      for (let i = 1; i <= count; i++) {
        points[i].x = Math.max(-left + center + 8, Math.min(innerWidth - left - center - 8, points[i].x));
      }
      if (drag) {
        const a = points[drag.index], b = points[drag.index + 1];
        const u = 1 - drag.fraction, v = drag.fraction;
        const weight = a.weight * u * u + b.weight * v * v;
        if (weight > 0.000001) {
          const dx = drag.x - (a.x * u + b.x * v);
          const dy = drag.y - (a.y * u + b.y * v);
          a.x += dx * a.weight * u / weight;
          a.y += dy * a.weight * u / weight;
          b.x += dx * b.weight * v / weight;
          b.y += dy * b.weight * v / weight;
        }
      }
    }
  }

  function tick(time) {
    frame = null;
    accumulator += Math.min((time - previous) / 1000, 0.05);
    previous = time;
    while (accumulator >= dt) { step(); stepBoxes(); accumulator -= dt; }
    render();
    const speed = Math.max(...points.map(p => Math.hypot(p.x - p.oldX, p.y - p.oldY)));
    const boxesStill = boxSwings.every(swing => Math.abs(swing.velocity) < 0.003
      && Math.abs(Math.sin(swing.angle)) < 0.003);
    quiet = speed < 0.025 && boxesStill ? quiet + 1 : 0;
    if (drag || quiet < 90) frame = requestAnimationFrame(tick);
  }

  function reset(drop = false) {
    if (drag) {
      const id = drag.pointerId;
      drag = null;
      rope.classList.remove('is-dragging');
      if (hit.hasPointerCapture(id)) hit.releasePointerCapture(id);
    }
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    const height = innerHeight * 0.9;
    center = rope.clientWidth / 2;
    length = height / count;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    const boxHeight = Math.max(...links.map(link => link.offsetHeight));
    const first = Math.min(count - 2, (header + 30) / length);
    const last = Math.max(first, (height - boxHeight - 40) / length);
    // Fractional positions keep spacing exact instead of snapping signs to nodes.
    attachments = links.map((_, i) => links.length === 1 ? (first + last) / 2 : first + (last - first) * i / (links.length - 1));
    const weightedNodes = new Set(attachments.map(position => Math.round(position)));
    const falling = drop && !motion.matches;
    points = Array.from({ length: count + 1 }, (_, i) => {
      const x = center + (falling ? Math.sin(i * 0.55) * 20 : 0);
      const y = falling ? i * length * 0.12 : i * length;
      return { x, y, oldX: x - (falling ? Math.sin(i * 0.3) * 0.7 : 0), oldY: y,
        weight: i === 0 ? 0 : weightedNodes.has(i) ? 0.4 : 1 };
    });
    boxSwings = links.map((link, i) => {
      const pivot = attachmentPoint(i);
      const h = Math.max(1, link.offsetHeight), w = Math.max(1, link.offsetWidth);
      return { ...pivot, vx: 0, vy: 0, ax: 0, ay: 0, angle: 0, velocity: 0,
        pendulumLength: (w * w / 12 + h * h / 3) / (h / 2) };
    });
    render();
    quiet = 0;
    accumulator = 0;
    previous = performance.now();
    if (!motion.matches) frame = requestAnimationFrame(tick);
  }
  window.addEventListener('resize', () => reset());
  motion.addEventListener('change', () => reset());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
    if (document.hidden && frame !== null) { cancelAnimationFrame(frame); frame = null; }
    else if (!document.hidden && !motion.matches) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  });
  reset(true);
})();
