(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

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

  /** Decorative Crime Coefficient — stable pseudo-score, not real data. */
  function decorativeCC(seed) {
    let h = 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    const n = Math.abs(h) % 420;
    return (n / 10).toFixed(1);
  }

  function scanLabel(index) {
    const id = String(index + 1).padStart(3, '0');
    return `[ SCAN · ${id} ]`;
  }

  function createGaugeCard(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const cc = decorativeCC(project.title);
    const inner = img
      ? `<div class="gauge-card__inner"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="gauge-card__inner gauge-card__inner--empty">NO SIG</div>`;
    const visitBtn = visit
      ? `<a class="gauge-card__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();

    return `
      <article class="gauge-card" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <p class="gauge-card__cc" aria-hidden="true">${cc}</p>
        <div class="gauge-card__ring">${inner}</div>
        <div class="gauge-card__meta">
          <h3 class="gauge-card__title">${escapeHtml(project.title)}</h3>
          <span class="gauge-card__cat">${getCategoryLabel(cat)}</span>
          ${visitBtn}
        </div>
      </article>`;
  }

  function createScanRow(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const cc = decorativeCC(`${project.title}-${index}`);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="scan-row__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span class="scan-row__visit scan-row__visit--offline">—</span>';

    return `
      <article class="scan-row" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <span class="scan-row__label">${scanLabel(index)}</span>
        <span class="scan-row__wave" aria-hidden="true"></span>
        <div class="scan-row__body">
          <h3 class="scan-row__title">${escapeHtml(project.title)}</h3>
          <p class="scan-row__tech">${escapeHtml(project.tech || '')}</p>
        </div>
        <span class="scan-row__cc" aria-hidden="true">${cc}</span>
        <span class="scan-row__cat">${getCategoryLabel(cat)}</span>
        <div class="scan-row__actions">${visitBtn}</div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;

    document.querySelectorAll('.scan-row').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
      if (ok) visible += 1;
    });

    let featVisible = 0;
    document.querySelectorAll('#featured-row .gauge-card').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
      if (ok) featVisible += 1;
    });
    const featSection = document.getElementById('featured-section');
    if (featSection && featSection.querySelector('.gauge-card')) {
      featSection.hidden = featVisible === 0;
    }

    const indexEl = document.getElementById('telemetry-index');
    if (indexEl) indexEl.textContent = `INDEX: ${visible}`;

    const empty = document.getElementById('empty-state');
    const anyScanVisible = visible > 0;
    if (empty) empty.hidden = anyScanVisible;
  }

  function tickClock() {
    const el = document.getElementById('telemetry-clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });

    const sorted = [...projects].sort(projectSort);
    const featured = sorted.filter((p) => p.featured === true || p.featured === 'true');
    const featTitles = new Set(featured.map((p) => p.title));
    const rest = sorted.filter((p) => !featTitles.has(p.title));

    const featSection = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSection.hidden = false;
      featRow.innerHTML = featured.map((p, i) => createGaugeCard(p, i)).join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-list').innerHTML = rest
      .map((p, i) => createScanRow(p, i))
      .join('');

    applyFilters();
  }

  tickClock();
  setInterval(tickClock, 1000);

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch(console.error);
})();
