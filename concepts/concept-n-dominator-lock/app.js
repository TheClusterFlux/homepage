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

  function decorativeCoeff(index, eliminator) {
    const base = eliminator ? 280 + (index % 7) * 13 : 42 + (index % 9) * 11;
    return String(base).padStart(3, '0');
  }

  function targetId(index, eliminator) {
    const prefix = eliminator ? 'E' : 'T';
    return `${prefix}-${String(index + 1).padStart(3, '0')}`;
  }

  function createTarget(project, index, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const eliminator = opts.eliminator === true;
    const tid = targetId(index, eliminator);
    const coeff = decorativeCoeff(index, eliminator);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const stagger = index % 3;

    const visitBtn = visit
      ? `<a class="dl-target__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span class="dl-target__visit dl-target__visit--offline">No link</span>';

    const media = img
      ? `<div class="dl-target__thumb"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="dl-target__thumb dl-target__thumb--empty"><span>${escapeHtml(project.title.slice(0, 2).toUpperCase())}</span></div>`;

    const modeLabel = eliminator ? 'ELIMINATOR' : 'PARALYZER';
    const classExtra = eliminator ? ' dl-target--eliminator' : '';
    const staggerClass = eliminator ? '' : ` dl-target--stagger-${stagger}`;

    return `
      <article class="dl-target${classExtra}${staggerClass}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <div class="dl-reticle" aria-hidden="true">
          <span class="dl-reticle__corner dl-reticle__corner--tl"></span>
          <span class="dl-reticle__corner dl-reticle__corner--tr"></span>
          <span class="dl-reticle__corner dl-reticle__corner--bl"></span>
          <span class="dl-reticle__corner dl-reticle__corner--br"></span>
          <span class="dl-reticle__sweep"></span>
        </div>
        <header class="dl-target__head">
          <span class="dl-target__id">${tid}</span>
          <span class="dl-target__coeff" title="Decorative readout">CC ${coeff}</span>
          <span class="dl-target__mode">${modeLabel}</span>
        </header>
        ${media}
        <div class="dl-target__body">
          <span class="dl-target__sector dl-target__sector--${cat}">${getCategoryLabel(cat)}</span>
          <h3 class="dl-target__title">${escapeHtml(project.title)}</h3>
          <p class="dl-target__desc">${escapeHtml(project.description || '')}</p>
          <p class="dl-target__tech">${escapeHtml(project.tech || '')}</p>
        </div>
        <footer class="dl-target__foot">${visitBtn}</footer>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;
    document.querySelectorAll('.dl-target').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
      if (ok) visible += 1;
    });
    const countEl = document.getElementById('dl-lock-count');
    if (countEl) countEl.textContent = String(visible).padStart(3, '0');
    const modeEl = document.getElementById('dl-mode');
    const featVisible = document.querySelectorAll('.dl-target--eliminator:not([hidden])').length;
    if (modeEl) {
      modeEl.textContent = featVisible > 0 && !q && cat === 'all' ? 'MIXED' : 'PARALYZER';
      modeEl.classList.toggle('dl-readout__value--alert', featVisible > 0 && !q && cat === 'all');
    }
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
        .map((p, i) => createTarget(p, i, { eliminator: true }))
        .join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createTarget(p, i, { eliminator: false }))
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
