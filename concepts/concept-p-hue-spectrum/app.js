(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  const SPECTRUM = {
    clear: { r: 0, g: 212, b: 255 },
    purple: { r: 124, g: 107, b: 255 },
    criminal: { r: 255, g: 45, b: 138 },
  };

  let allProjects = [];
  let visibleIndices = [];
  let activeGlobalIndex = -1;

  const els = {
    search: document.getElementById('search-bar'),
    category: document.getElementById('category-filter'),
    markers: document.getElementById('spectrum-markers'),
    cursor: document.getElementById('spectrum-cursor'),
    detailIdle: document.getElementById('detail-idle'),
    detailPanel: document.getElementById('detail-panel'),
    grid: document.getElementById('projects-grid'),
    featSection: document.getElementById('featured-section'),
    featRow: document.getElementById('featured-row'),
    emptyState: document.getElementById('empty-state'),
    count: document.getElementById('telemetry-count'),
    clock: document.getElementById('telemetry-clock'),
    canvas: document.getElementById('cymatic-canvas'),
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

  /** Deterministic 0–1 pseudo-hue from title. */
  function titleHue(title) {
    let h = 0;
    const s = String(title);
    for (let i = 0; i < s.length; i += 1) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return (Math.abs(h) % 10000) / 10000;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpRgb(c1, c2, t) {
    return {
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t)),
    };
  }

  function spectrumRgb(t) {
    if (t <= 0.5) {
      return lerpRgb(SPECTRUM.clear, SPECTRUM.purple, t / 0.5);
    }
    return lerpRgb(SPECTRUM.purple, SPECTRUM.criminal, (t - 0.5) / 0.5);
  }

  function rgbCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  function coeffLabel(t) {
    const pct = Math.round(t * 100);
    if (t < 0.33) return `HUE ${pct} · CLEAR BAND`;
    if (t < 0.66) return `HUE ${pct} · CLOUDY`;
    return `HUE ${pct} · LATENT`;
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

  function pctCss(t) {
    const clamped = Math.max(0.04, Math.min(0.96, t));
    return `${(clamped * 100).toFixed(2)}%`;
  }

  function setActive(globalIndex, options) {
    options = options || {};
    activeGlobalIndex = globalIndex;

    document.querySelectorAll('.hue-marker').forEach((m) => {
      m.classList.toggle('hue-marker--active', Number(m.dataset.globalIndex) === globalIndex);
    });
    document.querySelectorAll('.registry-card').forEach((c) => {
      c.classList.toggle('registry-card--active', Number(c.dataset.globalIndex) === globalIndex);
    });

    if (globalIndex < 0 || !allProjects[globalIndex]) {
      els.detailPanel.hidden = true;
      els.detailPanel.innerHTML = '';
      els.detailIdle.hidden = false;
      els.cursor.hidden = true;
      return;
    }

    const project = allProjects[globalIndex];
    const t = titleHue(project.title);
    const rgb = spectrumRgb(t);
    const color = rgbCss(rgb);
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);

    els.cursor.hidden = false;
    els.cursor.style.setProperty('--cursor-pct', pctCss(t));

    const visual = img
      ? `<img class="detail-panel__thumb" src="${escapeAttr(img)}" alt="" loading="lazy">`
      : `<div class="detail-panel__thumb detail-panel__thumb--empty">NO SCAN</div>`;
    const visitBtn = visit
      ? `<a class="detail-panel__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    els.detailPanel.innerHTML = `
      ${visual}
      <div class="detail-panel__meta">
        <p class="detail-panel__coeff" style="--coeff-color: ${color}">${coeffLabel(t)}</p>
        <h2 class="detail-panel__title">${escapeHtml(project.title)}</h2>
        <span class="detail-panel__cat">${getCategoryLabel(cat)}</span>
        <p class="detail-panel__desc">${escapeHtml(project.description || '')}</p>
        <p class="detail-panel__tech">${escapeHtml(project.tech || '')}</p>
        ${visitBtn}
      </div>`;
    els.detailPanel.hidden = false;
    els.detailIdle.hidden = true;

    if (options.scrollMarker) {
      const marker = els.markers.querySelector(`[data-global-index="${globalIndex}"]`);
      if (marker) marker.focus({ preventScroll: false });
    }
  }

  function buildMarkers() {
    visibleIndices = [];
    allProjects.forEach((p, i) => {
      if (matchesFilter(p)) visibleIndices.push(i);
    });

    els.emptyState.hidden = visibleIndices.length > 0;
    els.count.textContent = `SUBJECTS: ${visibleIndices.length}`;

    els.markers.innerHTML = visibleIndices
      .map((globalIdx) => {
        const p = allProjects[globalIdx];
        const t = titleHue(p.title);
        const color = rgbCss(spectrumRgb(t));
        const featured =
          p.featured === true || p.featured === 'true' ? ' hue-marker--featured' : '';
        const title = escapeAttr(p.title);
        return `
          <button type="button" class="hue-marker${featured}"
            data-global-index="${globalIdx}"
            style="--hue-pct: ${pctCss(t)}; --marker-color: ${color}"
            title="${title}"
            aria-label="${title}, ${coeffLabel(t)}"></button>`;
      })
      .join('');

    els.markers.querySelectorAll('.hue-marker').forEach((btn) => {
      btn.addEventListener('click', () => setActive(Number(btn.dataset.globalIndex)));
      btn.addEventListener('mouseenter', () => {
        if (activeGlobalIndex < 0) {
          els.cursor.hidden = false;
          els.cursor.style.setProperty('--cursor-pct', btn.style.getPropertyValue('--hue-pct'));
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (activeGlobalIndex < 0) els.cursor.hidden = true;
      });
    });

    if (activeGlobalIndex >= 0 && !visibleIndices.includes(activeGlobalIndex)) {
      setActive(visibleIndices.length ? visibleIndices[0] : -1);
    } else if (activeGlobalIndex >= 0) {
      setActive(activeGlobalIndex);
    }
  }

  function buildGrid() {
    els.grid.innerHTML = allProjects
      .map((p, globalIdx) => {
        const t = titleHue(p.title);
        const color = rgbCss(spectrumRgb(t));
        const visit = getVisitUrl(p.links);
        const hidden = matchesFilter(p) ? '' : ' registry-card--hidden';
        const visitLink = visit
          ? `<div class="registry-card__actions"><a class="btn-visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Visit</a></div>`
          : '';
        return `
          <li>
            <button type="button" class="registry-card${hidden}" data-global-index="${globalIdx}"
              style="--card-accent: ${color}" data-category="${getCategory(p)}">
              <div class="registry-card__row">
                <h3 class="registry-card__title">${escapeHtml(p.title)}</h3>
                <span class="registry-card__hue">${Math.round(t * 100)}</span>
              </div>
              <p class="registry-card__desc">${escapeHtml(p.description || '')}</p>
              ${visitLink}
            </button>
          </li>`;
      })
      .join('');

    els.grid.querySelectorAll('.registry-card').forEach((card) => {
      card.addEventListener('click', () => setActive(Number(card.dataset.globalIndex), { scrollMarker: true }));
    });
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
        const t = titleHue(p.title);
        const color = rgbCss(spectrumRgb(t));
        const img = thumbUrl(p);
        const thumb = img
          ? `<img class="featured-chip__thumb" src="${escapeAttr(img)}" alt="" loading="lazy">`
          : '';
        return `
          <button type="button" class="featured-chip" role="listitem" data-global-index="${globalIdx}">
            <span class="featured-chip__dot" style="background: ${color}; color: ${color}"></span>
            ${thumb}
            <span>
              <span class="featured-chip__title">${escapeHtml(p.title)}</span>
              <span class="featured-chip__hue">${coeffLabel(t)}</span>
            </span>
          </button>`;
      })
      .join('');

    els.featRow.querySelectorAll('.featured-chip').forEach((chip) => {
      chip.addEventListener('click', () =>
        setActive(Number(chip.dataset.globalIndex), { scrollMarker: true })
      );
    });
  }

  function applyFilters() {
    buildGrid();
    buildMarkers();
    buildFeatured();
  }

  function tuneAlongSpectrum(delta) {
    if (!visibleIndices.length) return;

    const sorted = [...visibleIndices].sort(
      (a, b) => titleHue(allProjects[a].title) - titleHue(allProjects[b].title)
    );
    const currentInSort = sorted.indexOf(activeGlobalIndex);
    let nextIdx;
    if (currentInSort < 0) {
      nextIdx = sorted[delta > 0 ? 0 : sorted.length - 1];
    } else {
      const ni = Math.max(0, Math.min(sorted.length - 1, currentInSort + delta));
      nextIdx = sorted[ni];
    }
    setActive(nextIdx, { scrollMarker: true });
  }

  function onKeyDown(e) {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      tuneAlongSpectrum(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      tuneAlongSpectrum(-1);
    }
  }

  function tickClock() {
    if (!els.clock) return;
    els.clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  }

  /* Cymatic wave background */
  function initCymatics() {
    const canvas = els.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const STEP = 2;
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');

    function resize() {
      w = Math.ceil(window.innerWidth / STEP);
      h = Math.ceil(window.innerHeight / STEP);
      off.width = w;
      off.height = h;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    let t0 = performance.now();

    function frame(now) {
      const t = (now - t0) * 0.001;
      const img = octx.createImageData(w, h);
      const d = img.data;
      const scale = Math.min(w, h) * 0.012;

      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const nx = (x - w * 0.5) / scale;
          const ny = (y - h * 0.5) / scale;
          const v =
            Math.sin(nx * 1.1 + t * 0.9) * Math.sin(ny * 1.1 - t * 0.7) +
            0.6 * Math.sin(nx * 2.3 - t * 1.4) * Math.cos(ny * 2.1 + t * 0.5) +
            0.35 * Math.sin(Math.hypot(nx, ny) * 1.8 - t * 1.1);
          const n = (v + 2.5) / 5;
          const pos = Math.max(0, Math.min(1, n));
          const rgb = spectrumRgb(pos * 0.85 + 0.05);
          const intensity = 0.08 + Math.abs(v) * 0.04;
          const idx = (y * w + x) * 4;
          d[idx] = rgb.r * intensity;
          d[idx + 1] = rgb.g * intensity;
          d[idx + 2] = rgb.b * intensity;
          d[idx + 3] = 255;
        }
      }

      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, w, h, 0, 0, window.innerWidth, window.innerHeight);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });
    allProjects = [...projects].sort(projectSort);
    applyFilters();
    if (visibleIndices.length) setActive(visibleIndices[0]);
  }

  initCymatics();
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
