(() => {
  const overview = document.querySelector('#gurtville-overview');
  const citySection = document.querySelector('#cities-skylines');
  if (overview) {
    overview.muted = true;
    const slot = document.createElement('div');
    slot.className = 'gurtville-video-slot';
    overview.before(slot);
    const stage = document.createElement('div');
    stage.className = 'gurtville-stage';
    const scene = document.createElement('div');
    scene.className = 'gurtville-scene';
    scene.append(overview);
    stage.append(scene);
    const mapHint = document.createElement('aside');
    mapHint.className = 'gurtville-map-hint';
    mapHint.setAttribute('aria-label', 'City map instructions');
    const hintTitle = document.createElement('strong');
    hintTitle.textContent = 'Explore Gurtville';
    const hintText = document.createElement('p');
    hintText.textContent = 'Hover over a district to lift it and see its description. Click on a district to view it.';
    mapHint.append(hintTitle, hintText);
    stage.append(mapHint);
    slot.append(stage);
    // Boundaries traced from the supplied overview. Coordinates use its 2048 × 1050 frame.
    // Names, descriptions, colours, and pointer positions are editable independently.
    const districts = [
      { name: 'District 01', description: 'A neighbourhood across the bay.', color: '#75cf9a', point: [600,300], label: [180,65], path: 'M185 325 L682 231 L983 292 L532 347 Z' },
      { name: 'District 02', description: 'A small district with its own character.', color: '#f8ca6c', point: [1060,335], label: [760,65], path: 'M869 368 L1038 320 L1293 320 L1049 379 Z' },
      { name: 'District 03', description: 'Room for the city to grow.', color: '#aeb4ff', point: [1070,463], label: [1050,65], path: 'M944 432 L1368 473 L1426 480 L1407 507 L858 474 Z' },
      { name: 'District 04', description: 'A quiet corner beyond the skyline.', color: '#f3a0ca', point: [1647,295], label: [1630,65], path: 'M1569 264 L1689 273 L1723 308 L1485 308 Z' },
      { name: 'District 05', description: 'A skyline along the northern shore.', color: '#65cfe3', point: [1485,340], label: [1830,440], path: 'M1341 308 L1485 308 L1723 308 L1896 304 L1819 374 L1253 355 Z' },
      { name: 'District 06', description: 'Streets and services connecting the city.', color: '#f1a36c', point: [1255,434], label: [470,65], path: 'M1034 388 L1387 409.790123 L1368 473 L944 432 Z' },
      { name: 'District 07', description: 'A compact district beside the main route.', color: '#d9c77c', point: [1413,445], label: [1340,65], path: 'M1387 409.790123 L1478 415.407407 L1426 480 L1368 473 Z' },
      { name: 'District 08', description: 'The busy heart of Gurtville.', color: '#e9a1a0', point: [975,595], label: [490,970], path: 'M670 463 L858 474 L1407 507 L1258 713 L1012 680 L566 585 Z' },
      { name: 'District 09', description: 'A neighbourhood beside the waterfront.', color: '#9ccf72', point: [1565,495], label: [1740,560], path: 'M1478 415.407407 L1798 435.160494 L1417 618 L1258 713 L1407 507 L1426 480 Z' },
      { name: 'District 10', description: 'City life along the eastern coast.', color: '#b9a1f3', point: [1750,560], label: [1815,690], path: 'M1798 435.160494 L1925 443 L1822 658 L1417 618 Z' },
      { name: 'District 11', description: 'Industry and trade on the harbour.', color: '#6bc8bd', point: [610,785], label: [200,900], path: 'M566 585 L1012 680 L681 968 L183 832 Z' },
      { name: 'District 12', description: 'The city’s gateway to the wider world.', color: '#80b7ef', point: [1370,777], label: [1390,970], path: 'M1012 680 L1258 713 L1417 618 L1822 658 L1745 927 L681 968 Z' }
    ];
    const ns = 'http://www.w3.org/2000/svg';
    const svg = (tag, attrs) => {
      const element = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      return element;
    };
    const overlay = svg('svg', { viewBox: '0 0 2048 1050', preserveAspectRatio: 'none', class: 'gurtville-districts', role: 'img', 'aria-label': 'Gurtville districts with placeholder names and descriptions' });
    const areas = svg('g', { class: 'district-areas' });
    const labels = svg('g', { class: 'district-labels' });
    const hits = svg('g', { class: 'district-hover-targets' });
    const tiles = [];
    districts.forEach((district, index) => {
      const group = svg('g', { 'data-district': index + 1, style: `--district-color:${district.color}` });
      const shadow = svg('path', { d: district.path, class: 'district-slice-shadow', opacity: 0 });
      const sides = svg('g', { class: 'district-slice-sides', opacity: 0 });
      const top = svg('path', { d: district.path, class: 'district-area' });
      const coords = district.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const points = [];
      for (let i = 0; i < coords.length; i += 2) points.push([coords[i], coords[i + 1]]);
      const winding = Math.sign(points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length];
        return sum + a[0] * b[1] - b[0] * a[1];
      }, 0));
      const faces = [];
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length];
        // Only the camera-facing walls are visible beneath the raised surface.
        if ((b[0] - a[0]) * winding >= 0) return;
        const brightness = b[1] > a[1] ? 0.55 : 0.72;
        const rgb = [1, 3, 5].map(offset => Math.round(parseInt(district.color.slice(offset, offset + 2), 16) * brightness));
        const face = svg('path', { fill: `rgb(${rgb.join(',')})`, class: 'district-slice-face' });
        sides.append(face);
        faces.push({ a, b, face });
      });
      group.append(shadow, sides, top);
      areas.append(group);
      const [x, y] = district.point;
      const marker = svg('g', { class: 'district-marker', 'data-district-label': index + 1, 'data-hover-district': index, style: `--district-color:${district.color}` });
      // Invisible hit area connects the name and pin without a visible label box.
      marker.append(svg('rect', { x: x - 60, y: y - 76, width: 120, height: 82, class: 'district-hit-area' }));
      marker.append(svg('path', { d: `M${x} ${y} C${x-5} ${y-9} ${x-17} ${y-20} ${x-17} ${y-32} A17 17 0 1 1 ${x+17} ${y-32} C${x+17} ${y-20} ${x+5} ${y-9} ${x} ${y} Z`, class: 'district-pin' }));
      marker.append(svg('circle', { cx: x, cy: y-32, r: 6, class: 'district-pin-center' }));
      const title = svg('text', { x, y: y - 59, 'text-anchor': 'middle', class: 'district-name' });
      title.textContent = district.name;
      const description = svg('text', { x, y: y - 59, 'text-anchor': 'middle', class: 'district-description' });
      description.textContent = district.description;
      marker.append(title, description);
      labels.append(marker);
      hits.append(svg('path', { d: district.path, class: 'district-hover-target', 'data-hover-district': index }));
      tiles.push({ group, marker, top, shadow, sides, faces, anchorY: y, lift: 0 });
    });
    overlay.append(areas, hits, labels);
    scene.append(overlay);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let hoveredDistrict = -1;
    let liftFrame = null;
    let lastLiftTime = 0;
    function drawLift(time) {
      liftFrame = null;
      const dt = Math.min((time - lastLiftTime) / 1000 || 1 / 60, 0.05);
      lastLiftTime = time;

      let moving = false;
      for (const tile of tiles) {
        const target = tile === tiles[hoveredDistrict] && !document.hidden ? 1 : 0;
        tile.lift += (target - tile.lift) * (1 - Math.exp(-12 * dt));
        if (Math.abs(target - tile.lift) < 0.002) tile.lift = target;
        // Equal world-space height projects smaller near the distant horizon.
        // Apply the same projection to the top and walls, including depth within a district.
        const horizonY = 180;
        const liftScale = reducedMotion.matches ? 0 : tile.lift * 34 / (800 - horizonY);
        const raisedY = y => y - (y - horizonY) * liftScale;
        tile.top.setAttribute('transform', `matrix(1 0 0 ${1 - liftScale} 0 ${horizonY * liftScale})`);
        tile.marker.setAttribute('transform', `translate(0 ${raisedY(tile.anchorY) - tile.anchorY})`);
        tile.top.style.fillOpacity = 0.26 + tile.lift * 0.16;
        tile.shadow.setAttribute('opacity', tile.lift * 0.22);
        tile.sides.setAttribute('opacity', liftScale > 0 ? 0.9 : 0);
        for (const { a, b, face } of tile.faces) {
          face.setAttribute('d', `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${b[0]} ${raisedY(b[1])} L${a[0]} ${raisedY(a[1])} Z`);
        }
        tile.marker.classList.toggle('is-hovered', Boolean(target));
        if (tile.lift !== target) moving = true;
      }
      if (moving && !document.hidden) liftFrame = requestAnimationFrame(drawLift);
    }
    function setHoveredDistrict(index) {
      if (index === hoveredDistrict) return;
      hoveredDistrict = index;
      for (let i = 0; i < tiles.length; i++) {
        const hidden = index >= 0 && i !== index;
        tiles[i].group.classList.toggle('district-muted', hidden);
        tiles[i].marker.classList.toggle('district-muted', hidden);
      }
      if (index >= 0) {
        areas.append(tiles[index].group);
        labels.append(tiles[index].marker);
      }
      if (liftFrame === null) {
        lastLiftTime = performance.now();
        liftFrame = requestAnimationFrame(drawLift);
      }
    }
    // Observe movement outside the SVG too: its transparent gaps pass events through.
    let lastPointer = null;
    function syncDistrictHover(element) {
      const target = element?.closest?.('[data-hover-district]');
      const index = stage.classList.contains('show-districts') && target && overlay.contains(target)
        ? Number(target.dataset.hoverDistrict) : -1;
      setHoveredDistrict(index);
    }
    function clearDistrictHover() {
      lastPointer = null;
      setHoveredDistrict(-1);
    }
    document.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      lastPointer = { x: event.clientX, y: event.clientY };
      syncDistrictHover(event.target);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clearDistrictHover);
    document.addEventListener('pointercancel', clearDistrictHover);
    window.addEventListener('blur', clearDistrictHover);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearDistrictHover(); });
    const districtViewer = document.createElement('dialog');
    districtViewer.className = 'district-viewer';
    districtViewer.setAttribute('aria-label', 'District 01 video');
    const districtVideo = document.createElement('video');
    districtVideo.muted = true;
    districtVideo.loop = true;
    districtVideo.playsInline = true;
    districtVideo.controls = false;
    districtVideo.preload = 'none';
    const districtClips = {
      3: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.28.53.15%20-%20Web.mp4' },
      1: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.27.32.13%20-%20Web.mp4' },
      4: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.25.50.11%20-%20Web.mp4' },
      5: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.24.55.10%20-%20Web.mp4' },
      2: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.24.03.09%20-%20Web.mp4' },
      0: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.30.09.16%20-%20Web.mp4', loopEnd: 7 },
      7: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.23.02.08%20-%20Web.mp4' },
      8: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.19.54.04%20-%20Web.mp4' },
      9: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.19.54.04%20-%20Web.mp4' },
      10: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.22.03.07%20-%20Web.mp4' },
      11: { src: 'assets/simulations/cities-skylines/Cities%20Skylines%202026.11.15%20-%2016.19.12.03%20-%20Web.mp4' }
    };
    let selectedDistrict = null;
    function prepareDistrictClip(index) {
      const clip = districtClips[index];
      if (!clip || (districtVideo.getAttribute('src') === clip.src && !districtVideo.error)) return;
      districtVideo.preload = 'auto';
      districtVideo.src = clip.src;
      districtVideo.load();
    }
    overlay.addEventListener('pointerover', event => {
      const target = event.target.closest('[data-hover-district]');
      if (target && !districtViewer.open) prepareDistrictClip(Number(target.dataset.hoverDistrict));
    });
    // District 01 uses only the opening seven seconds; the source file stays intact.
    function loopDistrictOpening() {
      const end = districtClips[selectedDistrict]?.loopEnd;
      if (end && districtVideo.currentTime >= end) districtVideo.currentTime = 0;
    }
    districtVideo.addEventListener('timeupdate', loopDistrictOpening);
    if ('requestVideoFrameCallback' in districtVideo) {
      const checkDistrictFrame = () => {
        loopDistrictOpening();
        districtVideo.requestVideoFrameCallback(checkDistrictFrame);
      };
      districtVideo.requestVideoFrameCallback(checkDistrictFrame);
    }
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'district-viewer-back';
    backButton.textContent = '← Back to Gurtville';
    const viewerStatus = document.createElement('p');
    viewerStatus.className = 'district-viewer-status';
    viewerStatus.setAttribute('role', 'status');
    districtViewer.append(districtVideo, backButton, viewerStatus);
    document.body.append(districtViewer);

    let arrivalAnimation = null;

    let previousOverflow = '';
    function revealDistrictVideo() {
      if (!districtViewer.open || closingViewer || districtVideo.seeking || districtVideo.readyState < 2 || districtViewer.classList.contains('is-ready')) return;
      districtViewer.classList.add('is-ready');
      arrivalAnimation = districtVideo.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], { duration: reducedMotion.matches ? 0 : 400, easing: 'ease-in-out' });
      viewerStatus.textContent = '';
      arrivalAnimation.finished.then(() => { if (districtViewer.open) overview.pause(); }).catch(() => {});
    }
    // Seeking a cached clip back to zero need not fire loadeddata again.
    for (const event of ['loadeddata', 'canplay', 'playing', 'seeked']) {
      districtVideo.addEventListener(event, revealDistrictVideo);
    }
    districtVideo.addEventListener('error', () => {
      viewerStatus.textContent = 'The clip could not load. Please try again in Chrome or Edge.';
    });
    let closingViewer = false;
    function returnToMap() {
      if (closingViewer) return;
      closingViewer = true;
      overview.play().catch(() => {});
      arrivalAnimation?.cancel();
      const fade = districtVideo.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reducedMotion.matches ? 0 : 400, easing: 'ease-in-out', fill: 'forwards'
      });
      fade.finished.then(() => {
        districtViewer.close();
        fade.cancel();
        closingViewer = false;
      }).catch(() => { closingViewer = false; });
    }
    backButton.addEventListener('click', returnToMap);
    districtViewer.addEventListener('cancel', event => { event.preventDefault(); returnToMap(); });
    districtViewer.addEventListener('close', () => {

      districtVideo.pause();
      districtViewer.classList.remove('is-ready');

      arrivalAnimation?.cancel();

      document.body.style.overflow = previousOverflow;
      stage.classList.remove('is-visiting-district');
      clearDistrictHover();
      scheduleSize();
      syncOverview();
    });
    function visitDistrict(index) {
      if (!districtClips[index] || districtViewer.open || !stage.classList.contains('show-districts')) return;
      selectedDistrict = index;
      districtViewer.setAttribute('aria-label', `${districts[index].name} video`);
      clearDistrictHover();
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      stage.classList.add('is-visiting-district');
      districtViewer.showModal();
      backButton.focus();
      viewerStatus.textContent = `Loading ${districts[index].name}…`;
      prepareDistrictClip(index);
      if (districtVideo.readyState >= 1) districtVideo.currentTime = 0;
      // Start loading/decoding from the click itself, rather than waiting for a
      // readiness event before requesting playback (which can stall the handoff).
      districtVideo.play().then(revealDistrictVideo).catch(error => {
        if (!districtViewer.open || error.name === 'AbortError') return;
        viewerStatus.textContent = error.name === 'NotAllowedError'
          ? 'Playback was blocked by this browser. Try Chrome or Edge.'
          : 'The clip could not play. Please return to the map and try again.';
      });
      revealDistrictVideo();
    }
    overlay.addEventListener('click', event => {
      const target = event.target.closest('[data-hover-district]');
      if (target) visitDistrict(Number(target.dataset.hoverDistrict));
    });
    Object.keys(districtClips).forEach(key => {
      const index = Number(key), pin = tiles[index].marker;
      pin.setAttribute('role', 'button');
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('aria-label', `View ${districts[index].name}`);
      pin.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); visitDistrict(index); }
      });
    });
    let scrollFrame = null;
    const updateSize = () => {
      scrollFrame = null;
      const rect = slot.getBoundingClientRect();
      const height = window.innerHeight;
      const expanded = citySection?.querySelector('.project-toggle')?.getAttribute('aria-expanded') !== 'false';
      const distance = Math.abs(rect.top + rect.height / 2 - height / 2);
      // Hold full size briefly around the viewport centre, then shrink on exit.
      const progress = expanded && !reducedMotion.matches && rect.height > 0
        ? Math.max(0, Math.min(1, (height * 0.7 - distance) / (height * 0.6))) : 0;
      const amount = progress * progress * (3 - 2 * progress);
      if (amount > 0) {
        // Escape the accordion's clipping while retaining the video's layout space.
        if (stage.parentElement !== document.body) document.body.append(stage);
        stage.classList.add('is-scroll-expanded');
        Object.assign(stage.style, {
          left: `${rect.left * (1 - amount)}px`,
          top: `${rect.top * (1 - amount)}px`,
          width: `${rect.width + (document.documentElement.clientWidth - rect.width) * amount}px`,
          height: `${rect.height + (height - rect.height) * amount}px`,
          borderRadius: `${0.6 * (1 - amount)}rem`
        });
      } else {
        if (stage.parentElement !== slot) slot.append(stage);
        stage.classList.remove('is-scroll-expanded');
        stage.removeAttribute('style');
      }
      const width = rect.width + (document.documentElement.clientWidth - rect.width) * amount;
      const stageHeight = rect.height + (height - rect.height) * amount;
      const ratio = overview.videoWidth && overview.videoHeight ? overview.videoWidth / overview.videoHeight : 16 / 9;
      // Fill the viewport without side bars; keep the foreground and crop the sky.
      const sceneWidth = Math.max(width, stageHeight * ratio);
      scene.style.width = `${sceneWidth}px`;
      scene.style.height = `${sceneWidth / ratio}px`;
      stage.classList.toggle('show-districts', amount > 0.85);
      if (amount <= 0.85 && hoveredDistrict !== -1) setHoveredDistrict(-1);
      overlay.setAttribute('aria-hidden', String(amount <= 0.85));
      // Scrolling/resizing can move the map away from a stationary cursor.
      if (lastPointer) syncDistrictHover(document.elementFromPoint(lastPointer.x, lastPointer.y));
    };
    const scheduleSize = () => {
      if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateSize);
    };
    window.addEventListener('scroll', scheduleSize, { passive: true });
    window.addEventListener('resize', scheduleSize);
    overview.addEventListener('loadedmetadata', scheduleSize);
    reducedMotion.addEventListener('change', scheduleSize);
    new ResizeObserver(scheduleSize).observe(slot);
    citySection?.addEventListener('toggle', scheduleSize);
    scheduleSize();
    let inView = false;
    const syncOverview = () => {
      const expanded = citySection?.querySelector('.project-toggle')?.getAttribute('aria-expanded') !== 'false';
      if (inView && !document.hidden && expanded && !districtViewer.open) {
        overview.play().catch(() => {});
      } else overview.pause();
    };
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncOverview();
    });
    observer.observe(slot);
    document.addEventListener('visibilitychange', syncOverview);
    citySection?.addEventListener('toggle', syncOverview);
  }
  const video = document.querySelector('#city-video');
  const label = document.querySelector('#city-clip-label');
  const buttons = [...document.querySelectorAll('.city-clip')];
  if (!video) return;
  video.loop = true;
  video.muted = true;
  video.controls = false;
  let galleryVisible = false;
  const syncGallery = () => {
    const expanded = document.querySelector('#cities-skylines .project-toggle')?.getAttribute('aria-expanded') !== 'false';
    if (galleryVisible && !document.hidden && expanded) video.play().catch(() => {});
    else video.pause();
  };
  new IntersectionObserver(entries => {
    galleryVisible = entries[0].isIntersecting;
    syncGallery();
  }).observe(video);
  document.querySelectorAll('#cities-skylines .simulation-education').forEach(section => section.addEventListener('toggle', event => {
    if (!event.currentTarget.open && event.currentTarget.contains(video)) video.pause();
    // Re-measure the text for line-by-line reveals once the hidden content opens.
    document.querySelector('#cities-skylines')?.dispatchEvent(new Event('toggle'));
  }));
  const status = document.createElement('div');
  status.className = 'city-video-status';
  status.setAttribute('role', 'status');
  const message = document.createElement('span');
  const directLink = document.createElement('a');
  directLink.textContent = 'Open video directly';
  directLink.target = '_blank';
  directLink.rel = 'noopener';
  directLink.href = video.src;
  status.append(message, ' ', directLink);
  video.after(status);
  status.hidden = true;
  function showError() {
    const code = video.error?.code;
    message.textContent = code === 2
      ? 'The video could not be loaded. Check that the video files are available.'
      : 'This preview could not play the video. Try opening this page in Chrome or Edge.';
    status.hidden = false;
  }
  video.addEventListener('error', showError);
  video.addEventListener('playing', () => { status.hidden = true; });
  // Load only the selected clip; playback starts when the gallery is visible.
  video.preload = 'metadata';
  video.load();
  for (const button of buttons) {
    button.addEventListener('click', () => {
      video.pause();
      video.src = button.dataset.src;
      directLink.href = video.src;
      status.hidden = true;
      video.removeAttribute('poster');
      video.setAttribute('aria-label', button.textContent);
      label.textContent = button.textContent;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      video.load();
      video.play().catch(error => {
        if (error.name === 'AbortError') return; // A newer clip superseded this request.
        if (error.name === 'NotAllowedError') {
          message.textContent = 'Playback was blocked by this browser. Try Chrome or Edge.';
          status.hidden = false;
        } else showError();
      });
    });
  }
  document.addEventListener('visibilitychange', syncGallery);
  document.querySelector('#cities-skylines')?.addEventListener('toggle', event => {
    if (!event.currentTarget.classList.contains('is-expanded')) video.pause();
  });
})();
