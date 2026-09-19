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

  function thumbHtml(project, emptyClass) {
    const img = project.image ? `${THUMB_BASE}${project.image}` : '';
    if (!img) {
      return `<div class="${emptyClass} ${emptyClass}--empty"><span>No image</span></div>`;
    }
    return `<div class="${emptyClass}"><img src="${escapeHtml(img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('${emptyClass}--empty'); this.remove();"></div>`;
  }

  function visitButton(visit) {
    if (!visit) return '';
    return `<a class="btn-visit" href="${escapeHtml(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`;
  }

  function bandCard(project) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    return `
      <article class="band-card" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        ${thumbHtml(project, 'band-card__thumb')}
        <div class="band-card__body">
          <span class="tag tag--${cat}">${getCategoryLabel(cat)}</span>
          <h3 class="band-card__title">${title}</h3>
          <p class="band-card__desc">${escapeHtml(project.description || '')}</p>
          ${visit ? visitButton(visit) : ''}
        </div>
      </article>`;
  }

  function spineNode(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    const seq = String(index + 1).padStart(3, '0');
    return `
      <article class="spine-node" role="listitem" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        <div class="spine-node__card">
          ${thumbHtml(project, 'spine-node__thumb')}
          <div class="spine-node__body">
            <span class="spine-node__index">SEQ · ${seq}</span>
            <span class="tag tag--${cat}">${getCategoryLabel(cat)}</span>
            <h3 class="spine-node__title">${title}</h3>
            <p class="spine-node__desc">${escapeHtml(project.description || '')}</p>
            <p class="spine-node__tech">${escapeHtml(project.tech || '')}</p>
            ${visit ? visitButton(visit) : ''}
          </div>
        </div>
      </article>`;
  }

  let filterCat = 'all';
  let filterQ = '';

  function matchesFilters(el) {
    const c = el.getAttribute('data-category');
    const title = el.getAttribute('data-title') || '';
    const tech = el.getAttribute('data-tech') || '';
    const okCat = filterCat === 'all' || c === filterCat;
    const okQ = !filterQ || title.includes(filterQ) || tech.includes(filterQ);
    return okCat && okQ;
  }

  function applyFilters() {
    const items = document.querySelectorAll('.band-card, .spine-node');
    let visible = 0;
    items.forEach((el) => {
      const show = matchesFilters(el);
      el.hidden = !show;
      if (show && el.classList.contains('spine-node')) visible += 1;
    });

    const stripItems = [...document.querySelectorAll('.band-card')].filter((el) => !el.hidden);
    document.getElementById('featured-section').hidden = stripItems.length === 0;

    const countEl = document.getElementById('result-count');
    countEl.textContent = visible ? `${visible} sequences` : '';
    document.getElementById('empty-state').hidden = visible > 0;
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });

    const featured = projects.filter((p) => p.featured === true || p.featured === 'true');
    const order = ['games', 'tools', 'infrastructure'];
    featured.sort((a, b) => {
      const ai = order.indexOf(getCategory(a));
      const bi = order.indexOf(getCategory(b));
      if (ai !== bi) return ai - bi;
      return projectSort(a, b);
    });

    const stripSec = document.getElementById('featured-section');
    const stripRow = document.getElementById('featured-row');

    if (featured.length) {
      stripSec.hidden = false;
      stripRow.innerHTML = featured.map(bandCard).join('');
    } else {
      stripSec.hidden = true;
      stripRow.innerHTML = '';
    }

    const all = [...projects].sort(projectSort);
    document.getElementById('projects-grid').innerHTML = all
      .map((p, i) => spineNode(p, i))
      .join('');

    applyFilters();
  }

  document.getElementById('search-bar').addEventListener('input', (e) => {
    filterQ = e.target.value.toLowerCase();
    applyFilters();
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    filterCat = e.target.value;
    applyFilters();
  });

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => console.error(e));
})();
