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

  function caseId(index, priority) {
    const year = '26';
    const seq = String(index + 1).padStart(4, '0');
    return priority ? `P-${year}-${seq}` : `CF-${year}-${seq}`;
  }

  function decorativeCoeff(title) {
    let h = 0;
    for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    return (h % 420) + 12;
  }

  function synopsisWithRedaction(text) {
    const raw = text || 'No field notes on record.';
    const words = raw.split(/\s+/);
    if (words.length < 4) {
      return `<p class="dossier-file__synopsis">${escapeHtml(raw)}</p>`;
    }
    const mid = Math.floor(words.length / 2);
    const before = words.slice(0, mid - 1).join(' ');
    const after = words.slice(mid + 2).join(' ');
    return `<p class="dossier-file__synopsis">
      ${escapeHtml(before)}
      <span class="dossier-redact" aria-hidden="true">${escapeHtml(words.slice(mid - 1, mid + 2).join(' '))}</span>
      ${escapeHtml(after)}
    </p>`;
  }

  function createFile(project, index, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const priority = opts.priority === true;
    const id = caseId(index, priority);
    const coeff = decorativeCoeff(project.title);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="dossier-file__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit subject</a>`
      : '<span class="dossier-file__visit dossier-file__visit--muted">No public endpoint</span>';

    const mugshot = img
      ? `<div class="dossier-file__mugshot"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="dossier-file__mugshot dossier-file__mugshot--empty"><span>${escapeHtml(project.title.slice(0, 2).toUpperCase())}</span></div>`;

    const stamp = priority ? 'PRIORITY' : 'CONFIDENTIAL';

    return `
      <article class="dossier-file${priority ? ' dossier-file--priority' : ''}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <div class="dossier-file__tab" aria-hidden="true">
          <span>${id}</span>
        </div>
        <span class="dossier-file__stamp" aria-hidden="true">${stamp}</span>
        <div class="dossier-file__header">
          <span class="dossier-file__division dossier-file__division--${cat}">${getCategoryLabel(cat)}</span>
          <span class="dossier-file__coeff">CC <strong>${coeff}</strong></span>
        </div>
        <div class="dossier-file__body">
          ${mugshot}
          <div class="dossier-file__brief">
            <h3 class="dossier-file__subject">${escapeHtml(project.title)}</h3>
            ${synopsisWithRedaction(project.description)}
            <p class="dossier-file__stack">${escapeHtml(project.tech || '')}</p>
            <div class="dossier-file__actions">${visitBtn}</div>
          </div>
        </div>
        <div class="dossier-file__footer" aria-hidden="true">
          <span>MWPSB / CLUSTERFLUX</span>
          <span>REV. ${String(index + 1).padStart(2, '0')}</span>
        </div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;
    document.querySelectorAll('.dossier-file').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
      if (ok) visible += 1;
    });
    const countEl = document.getElementById('dossier-file-count');
    if (countEl) countEl.textContent = `FILES: ${visible}`;
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });

    const featured = projects.filter((p) => p.featured === true || p.featured === 'true').sort(projectSort);
    const featTitles = new Set(featured.map((p) => p.title));
    const rest = projects.filter((p) => !featTitles.has(p.title)).sort(projectSort);

    const featSection = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSection.hidden = false;
      featRow.innerHTML = featured
        .map((p, i) => createFile(p, i, { priority: true }))
        .join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createFile(p, i, { priority: false }))
      .join('');

    applyFilters();
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch(console.error);
})();
