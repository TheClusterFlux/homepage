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

  function createEmber(project, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="lc-ember__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    const artClass = img ? '' : ' lc-ember--no-art';
    const bg = img ? `style="--ember-img: url('${escapeAttr(img)}')"` : '';

    return `
      <article class="lc-ember${opts.featured ? ' lc-ember--featured' : ''}${artClass}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}"
        ${bg}>
        <div class="lc-ember__glass">
          <span class="lc-ember__cat">${getCategoryLabel(cat)}</span>
          <h3 class="lc-ember__title">${escapeHtml(project.title)}</h3>
          <p class="lc-ember__desc">${escapeHtml(project.description || '')}</p>
          <p class="lc-ember__tech">${escapeHtml(project.tech || '')}</p>
          ${visitBtn}
        </div>
      </article>`;
  }

  function createNode(project, index) {
    const side = index % 2 === 0 ? 'left' : 'right';
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="lc-node__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    const visual = img
      ? `<div class="lc-node__visual"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="lc-node__visual lc-node__visual--empty"></div>`;

    return `
      <li class="lc-node lc-node--${side}" data-category="${cat}" data-search="${escapeAttr(searchBlob)}">
        <span class="lc-node__bead" aria-hidden="true"></span>
        <div class="lc-node__card">
          ${visual}
          <div class="lc-node__body">
            <span class="lc-node__cat">${getCategoryLabel(cat)}</span>
            <h3 class="lc-node__title">${escapeHtml(project.title)}</h3>
            <p class="lc-node__desc">${escapeHtml(project.description || '')}</p>
            <p class="lc-node__tech">${escapeHtml(project.tech || '')}</p>
            ${visitBtn}
          </div>
        </div>
      </li>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    document.querySelectorAll('.lc-ember, .lc-node').forEach((el) => {
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
      featRow.innerHTML = featured.map((p) => createEmber(p, { featured: true })).join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createNode(p, i))
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
