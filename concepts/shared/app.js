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

  function createCard(project, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = project.image
      ? `${THUMB_BASE}${project.image}`
      : '';
    const featured = opts.featured
      ? '<span class="badge badge-featured">Featured</span>'
      : '';

    return `
      <article class="card" data-category="${cat}">
        ${featured}
        <span class="badge badge-cat badge-${cat}">${getCategoryLabel(cat)}</span>
        <div class="card-media">
          ${img
        ? `<img src="${img}" alt="" loading="lazy" onerror="this.closest('.card-media').classList.add('no-image')">`
        : ''}
          <div class="card-media-fallback"><span>No preview</span></div>
        </div>
        <div class="card-body">
          <h3 class="card-title">${project.title}</h3>
          <p class="card-desc">${project.description || ''}</p>
          <p class="card-tech">${project.tech || ''}</p>
          ${visit
        ? `<div class="card-actions"><a class="btn-visit" href="${visit}" target="_blank" rel="noopener noreferrer">Visit</a></div>`
        : '<div class="card-actions card-actions-empty"></div>'}
        </div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase();
    document.querySelectorAll('#projects-grid .card').forEach((el) => {
      const c = el.getAttribute('data-category');
      const title = el.querySelector('.card-title').textContent.toLowerCase();
      const tech = el.querySelector('.card-tech').textContent.toLowerCase();
      const okCat = cat === 'all' || c === cat;
      const okQ = !q || title.includes(q) || tech.includes(q);
      el.style.display = okCat && okQ ? '' : 'none';
    });
  }

  function render(projects) {
    projects.forEach((p) => {
      if (!p.category || !VALID.includes((p.category || '').toLowerCase())) {
        p.category = 'tools';
      } else {
        p.category = p.category.toLowerCase();
      }
    });

    const featured = projects.filter((p) => p.featured === true || p.featured === 'true');
    const order = ['games', 'tools', 'infrastructure'];
    featured.sort((a, b) => {
      const ai = order.indexOf(getCategory(a));
      const bi = order.indexOf(getCategory(b));
      if (ai !== bi) return ai - bi;
      return projectSort(a, b);
    });

    const featSec = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSec.hidden = false;
      featRow.innerHTML = featured
        .map((p) => `<div class="featured-slot">${createCard(p, { featured: true })}</div>`)
        .join('');
    } else {
      featSec.hidden = true;
    }

    const all = [...projects].sort(projectSort);
    document.getElementById('projects-grid').innerHTML = all.map((p) => createCard(p)).join('');
    applyFilters();
  }

  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('cf-concept-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (document.body.dataset.defaultTheme || (prefersDark ? 'dark' : 'light'));
    document.documentElement.setAttribute('data-theme', initial);
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('cf-concept-theme', next);
    });
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  initThemeToggle();

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => console.error(e));
})();
