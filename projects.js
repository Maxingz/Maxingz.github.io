(() => {
  const page = document.querySelector('.projects-page');
  if (!page) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Enhance native details into the same grid accordion used by Work Experience.
  // Without JavaScript, the original details elements still work normally.
  const projects = [...page.querySelectorAll('.project-entry')].map((details, index) => {
    const project = document.createElement('section');
    project.id = details.id || `project-${index + 1}`;
    project.className = 'project-entry is-expanded';
    const heading = document.createElement('h2');
    heading.className = 'project-heading';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-toggle';
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', `${project.id}-panel`);
    button.append(...details.querySelector('summary h2').childNodes);
    heading.append(button);
    const panel = document.createElement('div');
    panel.className = 'project-panel';
    panel.id = `${project.id}-panel`;
    const inner = document.createElement('div');
    inner.className = 'project-panel-inner';
    inner.append(details.querySelector('.project-body'));
    panel.append(inner);
    project.append(heading, panel);
    details.replaceWith(project);
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      inner.inert = !expanded;
      project.classList.toggle('is-expanded', expanded);
      project.dispatchEvent(new Event('toggle'));
    });
    panel.addEventListener('transitionend', event => {
      if (event.propertyName === 'grid-template-rows') project.dispatchEvent(new Event('toggle'));
    });
    return project;
  });
  const rope = document.querySelector('.project-rope');
  if (rope) {
    rope.replaceChildren(...projects.map(project => {
      const link = document.createElement('a');
      link.className = 'project-rope-box';
      link.href = `#${project.id}`;
      link.textContent = project.querySelector('.project-toggle').textContent.trim();
      return link;
    }));
  }
  const header = document.querySelector('.site-header');
  function updateHeaderSpace() {
    const height = header?.getBoundingClientRect().height || 0;
    document.documentElement.style.setProperty('--project-header-height', `${height}px`);
  }
  updateHeaderSpace();
  if (header && 'ResizeObserver' in window) new ResizeObserver(updateHeaderSpace).observe(header);
  rope?.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const project = projects.find(item => `#${item.id}` === link.hash);
    if (!project) return;
    event.preventDefault();
    if (!project.classList.contains('is-expanded')) project.querySelector('.project-toggle').click();
    project.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    history.replaceState(null, '', link.hash);
    project.querySelector('.project-toggle').focus({ preventScroll: true });
  });
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const nextReveal = new Map();
  const targets = new Map();
  let stopped = false;
  let rebuildFrame = null;

  // Keep natural wrapping and inline markup; words on each rendered line fade together.
  for (const block of page.querySelectorAll('.project-body h3, .project-body p, .project-body figcaption')) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const token of node.textContent.match(/\s+|\S+/g) || []) {
        if (/^\s+$/.test(token)) fragment.append(document.createTextNode(token));
        else {
          const word = document.createElement('span');
          word.className = 'project-reveal project-reveal-word';
          word.textContent = token;
          fragment.append(word);
        }
      }
      node.replaceWith(fragment);
    }
  }
  page.querySelectorAll('.project-body img').forEach(image =>
    image.classList.add('project-reveal', 'project-reveal-image'));

  const observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting && targets.has(entry.target))
      .sort((a, b) => targets.get(a.target).order - targets.get(b.target).order);
    const now = performance.now();
    for (const entry of entering) {
      const item = targets.get(entry.target);
      const start = Math.max(now + 50, nextReveal.get(item.project) || 0);
      for (const element of item.elements) {
        element.style.setProperty('--reveal-delay', `${start - now}ms`);
        element.classList.add('is-revealed');
      }
      // The sequence continues at its own pace, even if the visitor scrolls ahead.
      nextReveal.set(item.project, start + (item.image ? 240 : 130));
      observer.unobserve(entry.target);
      targets.delete(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });

  function rebuildLines() {
    rebuildFrame = null;
    if (stopped) return;
    observer.disconnect();
    targets.clear();
    let order = 0;
    for (const project of projects) {
      if (!project.classList.contains('is-expanded')) continue;
      for (const block of project.querySelectorAll('.project-body h3, .project-body p, .project-body figcaption, .project-body img')) {
        const items = [];
        if (block.matches('img')) {
          if (!block.classList.contains('is-revealed')) items.push([block]);
        } else {
          const lineHeight = parseFloat(getComputedStyle(block).lineHeight) || 24;
          let lineTop = -Infinity;
          for (const word of block.querySelectorAll('.project-reveal-word')) {
            const rect = word.getClientRects()[0];
            if (!rect) continue;
            // Keep superscripts with their surrounding text.
            if (Math.abs(rect.top - lineTop) > lineHeight * 0.5) {
              items.push([]);
              lineTop = rect.top;
            }
            if (!word.classList.contains('is-revealed')) items[items.length - 1].push(word);
          }
        }
        for (const elements of items) {
          if (!elements.length) continue;
          const anchor = elements[0];
          targets.set(anchor, { elements, project, order: order++, image: block.matches('img') });
          observer.observe(anchor);
        }
      }
    }
  }

  function scheduleRebuild() {
    if (!stopped && rebuildFrame === null) rebuildFrame = requestAnimationFrame(rebuildLines);
  }
  function showAll() {
    stopped = true;
    observer.disconnect();
    if (rebuildFrame !== null) cancelAnimationFrame(rebuildFrame);
    for (const element of page.querySelectorAll('.project-reveal')) {
      element.style.setProperty('--reveal-delay', '0ms');
      element.classList.add('is-revealed');
    }
  }
  projects.forEach(project => project.addEventListener('toggle', scheduleRebuild));
  window.addEventListener('resize', scheduleRebuild);
  document.fonts?.ready.then(scheduleRebuild);
  reducedMotion.addEventListener('change', event => { if (event.matches) showAll(); });
  page.addEventListener('focusin', event => {
    if (event.target.closest('.project-body')) showAll();
  });
  window.addEventListener('beforeprint', showAll);
  rebuildLines();
})();
