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

  function ledgerRef(index, featured) {
    const prefix = featured ? 'CR' : 'KV';
    return `${prefix}-${String(index + 1).padStart(3, '0')}`;
  }

  function createRelic(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const ref = ledgerRef(index, true);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="kv-relic__open" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Unseal · Visit</a>`
      : '';

    const hatch = img
      ? `<div class="kv-relic__hatch"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="kv-relic__hatch kv-relic__hatch--empty"></div>`;

    return `
      <article class="kv-relic" role="listitem" data-category="${cat}" data-search="${escapeAttr(searchBlob)}">
        <header class="kv-relic__head">
          <span class="kv-relic__ref">${ref}</span>
          <span class="kv-relic__wing">${getCategoryLabel(cat)}</span>
        </header>
        ${hatch}
        <h3 class="kv-relic__title">${escapeHtml(project.title)}</h3>
        <p class="kv-relic__desc">${escapeHtml(project.description || '')}</p>
        <p class="kv-relic__tech">${escapeHtml(project.tech || '')}</p>
        ${visitBtn}
      </article>`;
  }

  function createStrongbox(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const ref = ledgerRef(index, false);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="kv-box__open" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Open</a>`
      : '';

    const viewport = img
      ? `<div class="kv-box__viewport"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="kv-box__viewport kv-box__viewport--empty"></div>`;

    return `
      <article class="kv-box" role="listitem" data-category="${cat}" data-search="${escapeAttr(searchBlob)}">
        <div class="kv-box__face">
          <span class="kv-box__ref">${ref}</span>
          <span class="kv-box__dial" aria-hidden="true"></span>
          ${viewport}
        </div>
        <div class="kv-box__ledger">
          <span class="kv-box__wing kv-box__wing--${cat}">${getCategoryLabel(cat)}</span>
          <h3 class="kv-box__title">${escapeHtml(project.title)}</h3>
          <p class="kv-box__desc">${escapeHtml(project.description || '')}</p>
          <p class="kv-box__tech">${escapeHtml(project.tech || '')}</p>
          ${visitBtn}
        </div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    document.querySelectorAll('.kv-relic, .kv-box').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
    });
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
      featRow.innerHTML = featured.map((p, i) => createRelic(p, i)).join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createStrongbox(p, i))
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
