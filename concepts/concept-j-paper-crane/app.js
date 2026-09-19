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

  function createHorizonCrane(project, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="pc-crane__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    const visual = img
      ? `<div class="pc-crane__thumb"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="pc-crane__thumb pc-crane__thumb--empty"></div>`;

    const featClass = opts.featured ? ' pc-crane--featured' : '';

    return `
      <article class="pc-crane pc-crane--horizon${featClass}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <span class="pc-crane__crease" aria-hidden="true"></span>
        ${visual}
        <div class="pc-crane__fold">
          <span class="pc-crane__cat">${getCategoryLabel(cat)}</span>
          <h3 class="pc-crane__title">${escapeHtml(project.title)}</h3>
          <p class="pc-crane__desc">${escapeHtml(project.description || '')}</p>
          <p class="pc-crane__tech">${escapeHtml(project.tech || '')}</p>
          ${visitBtn}
        </div>
      </article>`;
  }

  function createFlockCrane(project, index) {
    const tilt = index % 3;
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="pc-crane__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    const visual = img
      ? `<div class="pc-crane__thumb"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>`
      : `<div class="pc-crane__thumb pc-crane__thumb--empty"></div>`;

    return `
      <article class="pc-crane pc-crane--flock pc-crane--tilt-${tilt}" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <span class="pc-crane__crease" aria-hidden="true"></span>
        ${visual}
        <div class="pc-crane__fold">
          <span class="pc-crane__cat">${getCategoryLabel(cat)}</span>
          <h3 class="pc-crane__title">${escapeHtml(project.title)}</h3>
          <p class="pc-crane__desc">${escapeHtml(project.description || '')}</p>
          <p class="pc-crane__tech">${escapeHtml(project.tech || '')}</p>
          ${visitBtn}
        </div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    document.querySelectorAll('.pc-crane').forEach((el) => {
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

    const featured = projects
      .filter((p) => p.featured === true || p.featured === 'true')
      .sort(projectSort);
    const featTitles = new Set(featured.map((p) => p.title));
    const rest = projects.filter((p) => !featTitles.has(p.title)).sort(projectSort);

    const featSection = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSection.hidden = false;
      featRow.innerHTML = featured
        .map((p) => createHorizonCrane(p, { featured: true }))
        .join('');
    } else {
      featSection.hidden = true;
      featRow.innerHTML = '';
    }

    document.getElementById('projects-grid').innerHTML = rest
      .map((p, i) => createFlockCrane(p, i))
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
