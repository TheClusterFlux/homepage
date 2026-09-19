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

  function thumbBlock(project) {
    const img = project.image ? `${THUMB_BASE}${project.image}` : '';
    if (!img) {
      return '<div class="thumb-band thumb-band-empty"><span>No image</span></div>';
    }
    return `<div class="thumb-band"><img src="${escapeHtml(img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('thumb-band-empty'); this.remove();"></div>`;
  }

  function visitButton(visit) {
    if (!visit) return '';
    return `<a class="btn-visit" href="${escapeHtml(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`;
  }

  function heroBlock(project) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    return `
      <article class="hero-card" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        ${thumbBlock(project)}
        <div class="hero-copy">
          <span class="tag tag-cat">${getCategoryLabel(cat)}</span>
          <h3 class="hero-project-title">${title}</h3>
          <p class="hero-desc">${escapeHtml(project.description || '')}</p>
          <p class="hero-tech">${escapeHtml(project.tech || '')}</p>
          ${visit ? `<div class="hero-actions">${visitButton(visit)}</div>` : ''}
        </div>
      </article>`;
  }

  function stripBlock(project) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    return `
      <article class="strip-item" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        ${thumbBlock(project)}
        <div class="strip-body">
          <span class="tag tag-cat">${getCategoryLabel(cat)}</span>
          <h3 class="strip-item-title">${title}</h3>
          ${visit ? visitButton(visit) : ''}
        </div>
      </article>`;
  }

  function gridBlock(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    const wide = index % 5 === 0 ? ' archive-item-wide' : index % 3 === 0 ? ' archive-item-tall' : '';
    return `
      <article class="archive-item${wide}" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        ${thumbBlock(project)}
        <div class="archive-body">
          <span class="tag tag-cat">${getCategoryLabel(cat)}</span>
          <h3 class="archive-item-title">${title}</h3>
          <p class="archive-desc">${escapeHtml(project.description || '')}</p>
          <p class="archive-tech">${escapeHtml(project.tech || '')}</p>
          ${visit ? `<div class="archive-actions">${visitButton(visit)}</div>` : ''}
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
    const items = document.querySelectorAll(
      '.hero-card, .strip-item, .archive-item'
    );
    let visible = 0;
    items.forEach((el) => {
      const show = matchesFilters(el);
      el.hidden = !show;
      if (show && el.classList.contains('archive-item')) visible += 1;
    });

    const hero = document.querySelector('.hero-card');
    const heroSec = document.getElementById('hero-featured');
    if (hero) {
      heroSec.hidden = hero.hidden;
    }

    const stripItems = [...document.querySelectorAll('.strip-item')].filter((el) => !el.hidden);
    document.getElementById('featured-section').hidden = stripItems.length === 0;

    const countEl = document.getElementById('result-count');
    countEl.textContent = visible ? `${visible} shown` : '';
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

    const heroRoot = document.getElementById('hero-featured-root');
    const heroSec = document.getElementById('hero-featured');
    const stripSec = document.getElementById('featured-section');
    const stripRow = document.getElementById('featured-row');

    if (featured.length) {
      heroRoot.innerHTML = heroBlock(featured[0]);
      heroSec.hidden = false;
      const rest = featured.slice(1);
      if (rest.length) {
        stripSec.hidden = false;
        stripRow.innerHTML = rest.map(stripBlock).join('');
      } else {
        stripSec.hidden = true;
        stripRow.innerHTML = '';
      }
    } else {
      heroSec.hidden = true;
      stripSec.hidden = true;
      heroRoot.innerHTML = '';
      stripRow.innerHTML = '';
    }

    const all = [...projects].sort(projectSort);
    document.getElementById('projects-grid').innerHTML = all
      .map((p, i) => gridBlock(p, i))
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
