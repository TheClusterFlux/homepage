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

  function slotId(index, priority) {
    const prefix = priority ? 'P' : 'U';
    return `${prefix}${String(index + 1).padStart(3, '0')}`;
  }

  function createBlade(project, index, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const priority = opts.priority === true;
    const slot = slotId(index, priority);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="sz-blade__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span class="sz-blade__visit sz-blade__visit--offline">No link</span>';

    const screen = img
      ? `<div class="sz-blade__screen"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="sz-blade__screen sz-blade__screen--empty"><span>${escapeHtml(project.title.slice(0, 2))}</span></div>`;

    const ledClass = priority ? ' sz-blade__led--hot' : visit ? '' : ' sz-blade__led--idle';

    return `
      <article class="sz-blade${priority ? ' sz-blade--priority' : ''}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <div class="sz-blade__handle" aria-hidden="true"></div>
        <span class="sz-blade__slot">${slot}</span>
        <span class="sz-blade__led${ledClass}" aria-hidden="true" title="Status"></span>
        ${screen}
        <div class="sz-blade__meta">
          <span class="sz-blade__zone sz-blade__zone--${cat}">${getCategoryLabel(cat)}</span>
          <h3 class="sz-blade__title">${escapeHtml(project.title)}</h3>
          <p class="sz-blade__desc">${escapeHtml(project.description || '')}</p>
          <p class="sz-blade__tech">${escapeHtml(project.tech || '')}</p>
        </div>
        <div class="sz-blade__actions">${visitBtn}</div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;
    document.querySelectorAll('.sz-blade').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      el.hidden = !ok;
      if (ok) visible += 1;
    });
    const countEl = document.getElementById('sz-blade-count');
    if (countEl) countEl.textContent = `BLADES: ${visible}`;
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
        .map((p, i) => createBlade(p, i, { priority: true }))
        .join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createBlade(p, i, { priority: false }))
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
