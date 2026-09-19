(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  const ringEl = document.getElementById('ring-outer');
  const detailPanel = document.getElementById('detail-panel');
  const coreIdle = document.getElementById('core-idle');
  const coreStat = document.getElementById('core-stat');
  const telemetryCount = document.getElementById('telemetry-count');
  const telemetryClock = document.getElementById('telemetry-clock');
  const radarHud = document.querySelector('.radar-hud');

  let allProjects = [];
  /** Display order on ring; index 0 = top (12 o'clock). */
  let ringOrder = [];
  let selectedId = null;
  let dragStart = null;

  function getCategory(p) {
    const c = (p.category || 'tools').toLowerCase();
    return VALID.includes(c) ? c : 'tools';
  }

  function getCategoryLabel(c) {
    return c.charAt(0).toUpperCase() + c.slice(1);
  }

  function getVisitUrl(links) {
    if (!links || typeof links !== 'object') return null;
    const key = Object.keys(links).find((k) =>
      ['visit', 'website', 'demo'].includes(k.toLowerCase())
    );
    return key ? links[key] : null;
  }

  function projectSort(a, b) {
    const aV = getVisitUrl(a.links);
    const bV = getVisitUrl(b.links);
    if (aV && !bV) return -1;
    if (!aV && bV) return 1;
    return a.title.localeCompare(b.title);
  }

  function projectKey(p) {
    return p._id || p.title;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function thumbUrl(project) {
    return project.image ? `${THUMB_BASE}${project.image}` : '';
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function matchesFilter(project, cat, q) {
    const c = getCategory(project);
    const blob = `${project.title} ${project.tech || ''}`.toLowerCase();
    return (cat === 'all' || c === cat) && (!q || blob.includes(q));
  }

  function getFilterState() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    return { cat, q };
  }

  function filteredProjects() {
    const { cat, q } = getFilterState();
    return allProjects.filter((p) => matchesFilter(p, cat, q)).sort(projectSort);
  }

  function measureHudSize() {
    const header = document.querySelector('.hud-header');
    const footer = document.querySelector('.hud-footer');
    const headerH = header ? header.getBoundingClientRect().height : 120;
    const footerH = footer ? footer.getBoundingClientRect().height : 48;
    const vertPad = 28;
    const horizPad = 20;
    const maxH = window.innerHeight - headerH - footerH - vertPad;
    const maxW = window.innerWidth - horizPad;
    const cap = 840;
    const size = Math.min(maxW, maxH, cap);
    const floor = Math.min(260, maxW);
    return Math.max(floor, Math.floor(size));
  }

  function ringRadiusForCount(count, hudSize) {
    const hudW = hudSize || measureHudSize();
    const half = hudW / 2;
    const nodeHalf = nodeSizeForCount(count, hudW) / 2;
    const labelPad = hudW < 400 ? 8 : 22;
    const coreClear = half * 0.5;
    const minR = coreClear + nodeHalf + 10;
    const maxR = half - nodeHalf - labelPad - 6;
    if (count <= 0) return Math.max(minR, maxR * 0.85);
    const crowdedBoost = count > 16 ? Math.min(28, (count - 16) * 2) : 0;
    return Math.min(maxR, minR + crowdedBoost);
  }

  function nodeSizeForCount(count, hudSize) {
    const hudW = hudSize || measureHudSize();
    const scale = hudW / 720;
    let base = 56;
    if (count <= 8) base = 64;
    else if (count <= 16) base = 56;
    else if (count <= 24) base = 48;
    else base = 42;
    return Math.max(34, Math.round(base * Math.min(1.12, Math.max(0.72, scale))));
  }

  function applyRingMetrics(count) {
    const hudSize = measureHudSize();
    document.documentElement.style.setProperty('--hud-size', `${hudSize}px`);
    const r = ringRadiusForCount(count, hudSize);
    const size = nodeSizeForCount(count, hudSize);
    document.documentElement.style.setProperty('--ring-outer-r', `${r}px`);
    document.documentElement.style.setProperty('--node-size', `${size}px`);
    document.documentElement.style.setProperty('--node-half', `${size / 2}px`);
    document.documentElement.style.setProperty('--ring-inner-r', `${Math.round(r * 0.55)}px`);
  }

  function createNode(project, slotIndex, count) {
    const cat = getCategory(project);
    const img = thumbUrl(project);
    const id = escapeAttr(projectKey(project));
    const searchBlob = escapeAttr(`${project.title} ${project.tech || ''}`.toLowerCase());
    const initials = escapeHtml(project.title.slice(0, 8));
    const featured = project.featured === true || project.featured === 'true';

    return `
      <div class="orbit-node${featured ? ' orbit-node--featured' : ''}"
        data-id="${id}"
        data-category="${cat}"
        data-search="${searchBlob}"
        style="--node-i: ${slotIndex}; --node-count: ${count}">
        <button type="button" class="orbit-node__btn${img ? '' : ' no-image'}"
          aria-label="${escapeAttr(project.title)}"
          data-select="${id}">
          ${img
        ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-image')">`
        : ''}
          <span class="orbit-node__fallback">${initials}</span>
          <span class="orbit-node__halo" aria-hidden="true"></span>
        </button>
        <span class="orbit-node__label">${escapeHtml(project.title)}</span>
      </div>`;
  }

  function renderDetail(project) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const featured = project.featured === true || project.featured === 'true';
    const visitBlock = visit
      ? `<a class="detail__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span class="detail__visit detail__visit--muted">No deploy link</span>';

    return `
      <div class="detail__media${img ? '' : ' no-image'}">
        ${img ? `<img src="${escapeAttr(img)}" alt="">` : ''}
        <div class="detail__media-fallback">No preview</div>
      </div>
      <div class="detail__meta">
        <span class="detail__badge detail__badge--${cat}">${getCategoryLabel(cat)}</span>
        ${featured ? '<span class="detail__badge detail__badge--featured">Featured</span>' : ''}
      </div>
      <h2 class="detail__title">${escapeHtml(project.title)}</h2>
      <p class="detail__desc">${escapeHtml(project.description || '')}</p>
      <p class="detail__tech">${escapeHtml(project.tech || '')}</p>
      ${visitBlock}`;
  }

  function projectByKey(id) {
    return allProjects.find((p) => projectKey(p) === id);
  }

  function syncNodeIndices() {
    const count = ringOrder.length;
    ringOrder.forEach((id, slotIndex) => {
      const el = ringEl.querySelector(`.orbit-node[data-id="${CSS.escape(id)}"]`);
      if (el) {
        el.style.setProperty('--node-i', String(slotIndex));
        el.style.setProperty('--node-count', String(count));
      }
    });
  }

  function rebuildRing(preserveSelection) {
    const visible = filteredProjects();
    const keys = visible.map(projectKey);
    const prevSelected = preserveSelection ? selectedId : null;

    if (!keys.length) {
      ringOrder = [];
      ringEl.innerHTML = '';
      applyRingMetrics(0);
      telemetryCount.textContent = 'NODES: 0';
      coreStat.textContent = 'No signals in sector';
      if (selectedId) clearSelection();
      return;
    }

    ringOrder = shuffle(keys);
    applyRingMetrics(keys.length);

    ringEl.innerHTML = ringOrder
      .map((id, slotIndex) => {
        const p = projectByKey(id);
        return p ? createNode(p, slotIndex, ringOrder.length) : '';
      })
      .join('');

    telemetryCount.textContent = `NODES: ${keys.length}`;
    coreStat.textContent = `${keys.length} signal${keys.length === 1 ? '' : 's'} · slot 0 = north`;

    if (prevSelected && keys.includes(prevSelected)) {
      swapToTop(prevSelected);
      selectProject(prevSelected, { skipSwap: true });
    } else if (prevSelected) {
      clearSelection();
    }
  }

  function swapToTop(id) {
    const idx = ringOrder.indexOf(id);
    if (idx <= 0) return;
    const tmp = ringOrder[0];
    ringOrder[0] = ringOrder[idx];
    ringOrder[idx] = tmp;
    syncNodeIndices();
  }

  /** Rotate every node one step on the ring; slot 0 is always top center (north). */
  function rotateRingOrder(delta) {
    const n = ringOrder.length;
    if (!n || !delta) return;
    const s = ((delta % n) + n) % n;
    if (s === 0) return;
    ringOrder = [...ringOrder.slice(s), ...ringOrder.slice(0, s)];
    syncNodeIndices();
    selectNorthFromRing();
  }

  function selectNorthFromRing() {
    if (!ringOrder.length) {
      clearSelection();
      return;
    }
    selectProject(ringOrder[0], { skipSwap: true });
  }

  function selectProject(id, opts) {
    opts = opts || {};
    const project = projectByKey(id);
    if (!project) return;

    if (!opts.skipSwap) swapToTop(id);

    selectedId = id;
    ringEl.querySelectorAll('.orbit-node').forEach((el) => {
      el.classList.toggle('is-selected', el.getAttribute('data-id') === id);
    });

    coreIdle.hidden = true;
    detailPanel.hidden = false;
    detailPanel.innerHTML = renderDetail(project);
  }

  function clearSelection() {
    selectedId = null;
    ringEl.querySelectorAll('.orbit-node.is-selected').forEach((el) => {
      el.classList.remove('is-selected');
    });
    coreIdle.hidden = false;
    detailPanel.hidden = true;
    detailPanel.innerHTML = '';
  }

  function cycleSelection(delta) {
    rotateRingOrder(delta);
  }

  function applyFilters() {
    rebuildRing(true);
  }

  function pointerAngle(clientX, clientY) {
    const rect = radarHud.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
  }

  function onPointerDown(e) {
    if (e.target.closest('.orbit-node__btn') || e.target.closest('.core-panel')) return;
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      baseAngle: pointerAngle(e.clientX, e.clientY),
      appliedSteps: 0,
    };
    radarHud.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragStart || !ringOrder.length) return;
    const n = ringOrder.length;
    const current = pointerAngle(e.clientX, e.clientY);
    let diff = current - dragStart.baseAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const stepSize = 360 / n;
    const steps = Math.trunc(diff / stepSize);
    const delta = steps - dragStart.appliedSteps;
    if (delta !== 0) {
      rotateRingOrder(delta);
      dragStart.appliedSteps = steps;
    }
  }

  function onPointerUp(e) {
    if (!dragStart) return;
    dragStart = null;
    try {
      radarHud.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onWheel(e) {
    if (!radarHud.contains(e.target)) return;
    e.preventDefault();
    cycleSelection(e.deltaY > 0 ? 1 : -1);
  }

  function tickClock() {
    telemetryClock.textContent = new Date().toISOString().slice(11, 19) + ' UTC';
  }

  ringEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-select]');
    if (!btn) return;
    const id = btn.getAttribute('data-select');
    if (selectedId === id) clearSelection();
    else selectProject(id);
  });

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSelection();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      cycleSelection(1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      cycleSelection(-1);
    }
  });

  radarHud.addEventListener('pointerdown', onPointerDown);
  radarHud.addEventListener('pointermove', onPointerMove);
  radarHud.addEventListener('pointerup', onPointerUp);
  radarHud.addEventListener('pointercancel', onPointerUp);
  radarHud.addEventListener('wheel', onWheel, { passive: false });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyRingMetrics(ringOrder.length), 80);
  });

  tickClock();
  setInterval(tickClock, 1000);
  ringEl.style.transform = 'rotate(0deg)';

  applyRingMetrics(0);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then((projects) => {
      projects.forEach((p) => {
        p.category = getCategory(p);
      });
      allProjects = projects;
      rebuildRing(false);
    })
    .catch((err) => {
      console.error(err);
      coreStat.textContent = 'Telemetry link failed';
    });
})();
