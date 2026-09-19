(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  let allProjects = [];
  let visibleIndices = [];
  let activeIndex = -1;
  let staticFrame = null;

  const els = {
    channelList: document.getElementById('channel-list'),
    tunerIdle: document.getElementById('tuner-idle'),
    tunerProgram: document.getElementById('tuner-program'),
    crtGlass: document.getElementById('crt-glass'),
    staticCanvas: document.getElementById('static-canvas'),
    signalLabel: document.getElementById('signal-label'),
    emptyState: document.getElementById('empty-state'),
    featSection: document.getElementById('featured-section'),
    featRow: document.getElementById('featured-row'),
    search: document.getElementById('search-bar'),
    category: document.getElementById('category-filter'),
    clock: document.getElementById('clock-label'),
  };

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

  function channelNum(i) {
    return String(i + 1).padStart(2, '0');
  }

  function searchBlob(project) {
    return `${project.title} ${project.tech || ''}`.toLowerCase();
  }

  function matchesFilter(project) {
    const cat = els.category.value;
    const q = els.search.value.toLowerCase().trim();
    const c = getCategory(project);
    return (cat === 'all' || c === cat) && (!q || searchBlob(project).includes(q));
  }

  function initStaticCanvas() {
    const canvas = els.staticCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.floor(rect.width) || 640;
      canvas.height = Math.floor(rect.height) || 360;
    }

    resize();
    window.addEventListener('resize', resize);

    staticFrame = function drawStatic() {
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 90 + ((Math.random() * 80) | 0);
      }
      ctx.putImageData(img, 0, 0);
    };
  }

  function burstStatic() {
    if (!staticFrame) return;
    els.crtGlass.classList.add('crt-glass--tuning');
    let n = 0;
    const max = 12;
    function tick() {
      staticFrame();
      n += 1;
      if (n < max) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => els.crtGlass.classList.remove('crt-glass--tuning'), 80);
      }
    }
    requestAnimationFrame(tick);
  }

  function renderProgram(project, globalIndex) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const visual = img
      ? `<div class="tuner-program__frame"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="tuner-program__frame tuner-program__frame--empty">NO FEED</div>`;
    const visitBtn = visit
      ? `<a class="tuner-program__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    els.tunerProgram.innerHTML = `
      <div class="tuner-program">
        ${visual}
        <div class="tuner-program__meta">
          <p class="tuner-program__ch">CH ${channelNum(globalIndex)} · ON AIR</p>
          <h2 class="tuner-program__title">${escapeHtml(project.title)}</h2>
          <span class="tuner-program__cat">${getCategoryLabel(cat)}</span>
          <p class="tuner-program__desc">${escapeHtml(project.description || '')}</p>
          <p class="tuner-program__tech">${escapeHtml(project.tech || '')}</p>
          ${visitBtn}
        </div>
      </div>`;
    els.tunerProgram.hidden = false;
    els.tunerIdle.hidden = true;
    els.signalLabel.textContent = `SIGNAL: CH ${channelNum(globalIndex)} LOCK`;
  }

  function tuneToListIndex(listIdx, options) {
    options = options || {};
    if (listIdx < 0 || listIdx >= visibleIndices.length) {
      activeIndex = -1;
      els.tunerProgram.hidden = true;
      els.tunerProgram.innerHTML = '';
      els.tunerIdle.hidden = false;
      els.signalLabel.textContent = visibleIndices.length ? 'SIGNAL: STANDBY' : 'SIGNAL: NO CARRIER';
      document.querySelectorAll('.channel-item').forEach((el) => el.classList.remove('channel-item--active'));
      return;
    }

    const globalIndex = visibleIndices[listIdx];
    activeIndex = listIdx;
    if (options.animate !== false) burstStatic();
    renderProgram(allProjects[globalIndex], globalIndex);

    document.querySelectorAll('.channel-item').forEach((el) => {
      const isActive = Number(el.dataset.listIndex) === listIdx;
      el.classList.toggle('channel-item--active', isActive);
      if (isActive) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function buildChannelList() {
    visibleIndices = [];
    allProjects.forEach((p, i) => {
      if (matchesFilter(p)) visibleIndices.push(i);
    });

    els.emptyState.hidden = visibleIndices.length > 0;
    els.channelList.innerHTML = visibleIndices
      .map((globalIdx, listIdx) => {
        const p = allProjects[globalIdx];
        const cat = getCategory(p);
        return `
          <li>
            <button type="button" class="channel-item" data-list-index="${listIdx}" data-global-index="${globalIdx}">
              <span class="channel-item__num">${channelNum(globalIdx)}</span>
              <span>
                <span class="channel-item__title">${escapeHtml(p.title)}</span>
                <span class="channel-item__band">${getCategoryLabel(cat)}</span>
              </span>
            </button>
          </li>`;
      })
      .join('');

    els.channelList.querySelectorAll('.channel-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        tuneToListIndex(Number(btn.dataset.listIndex));
      });
    });

    if (activeIndex >= visibleIndices.length) {
      tuneToListIndex(visibleIndices.length ? 0 : -1, { animate: false });
    } else if (activeIndex >= 0) {
      tuneToListIndex(activeIndex, { animate: false });
    }
  }

  function buildFeatured() {
    const featured = allProjects
      .filter((p) => (p.featured === true || p.featured === 'true') && matchesFilter(p))
      .sort(projectSort);

    if (!featured.length) {
      els.featSection.hidden = true;
      els.featRow.innerHTML = '';
      return;
    }

    els.featSection.hidden = false;
    els.featRow.innerHTML = featured
      .map((p) => {
        const globalIdx = allProjects.indexOf(p);
        const listIdx = visibleIndices.indexOf(globalIdx);
        const img = thumbUrl(p);
        const thumb = img
          ? `<img class="preset-chip__thumb" src="${escapeAttr(img)}" alt="" loading="lazy">`
          : '';
        return `
          <button type="button" class="preset-chip" role="listitem" data-list-index="${listIdx}" data-global-index="${globalIdx}">
            ${thumb}
            <span>
              <span class="preset-chip__num">CH ${channelNum(globalIdx)}</span>
              <span class="preset-chip__title">${escapeHtml(p.title)}</span>
            </span>
          </button>`;
      })
      .join('');

    els.featRow.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const listIdx = Number(chip.dataset.listIndex);
        if (listIdx >= 0) tuneToListIndex(listIdx);
        else {
          const globalIdx = Number(chip.dataset.globalIndex);
          visibleIndices = allProjects.map((_, i) => i).filter((i) => matchesFilter(allProjects[i]));
          buildChannelList();
          const newListIdx = visibleIndices.indexOf(globalIdx);
          if (newListIdx >= 0) tuneToListIndex(newListIdx);
        }
      });
    });
  }

  function applyFilters() {
    buildChannelList();
    buildFeatured();
  }

  function onKeyDown(e) {
    if (e.target.matches('input, select, textarea')) return;
    if (!visibleIndices.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, visibleIndices.length - 1);
      tuneToListIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = activeIndex < 0 ? visibleIndices.length - 1 : Math.max(activeIndex - 1, 0);
      tuneToListIndex(next);
    }
  }

  function tickClock() {
    if (!els.clock) return;
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });
    allProjects = [...projects].sort(projectSort);
    applyFilters();
  }

  initStaticCanvas();
  tickClock();
  setInterval(tickClock, 1000);

  els.search.addEventListener('input', applyFilters);
  els.category.addEventListener('change', applyFilters);
  document.addEventListener('keydown', onKeyDown);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch(console.error);
})();
