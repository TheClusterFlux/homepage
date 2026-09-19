(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  const BENTO_PATTERN = [
    'span-2x2',
    'span-2x1',
    'span-1x2',
    'span-1x1',
    'span-1x1',
    'span-2x1',
    'span-1x1',
    'span-1x2',
    'span-2x2',
    'span-1x1',
  ];

  let filterCat = 'all';
  let filterQ = '';

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
      return '<div class="tx-thumb tx-thumb-empty"><span>No signal</span></div>';
    }
    return `<div class="tx-thumb"><img src="${escapeHtml(img)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('tx-thumb-empty'); this.remove();"></div>`;
  }

  function visitOnly(visit) {
    if (!visit) return '';
    return `<a class="btn-tx" href="${escapeHtml(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`;
  }

  function transmissionCard(project, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const title = escapeHtml(project.title);
    const featured = opts.featured
      ? '<span class="tx-badge tx-badge-priority">PRIORITY</span>'
      : '';
    const span = opts.span ? ` ${opts.span}` : '';

    return `
      <article class="tx-card${span}" data-category="${cat}" data-title="${title.toLowerCase()}" data-tech="${escapeHtml((project.tech || '').toLowerCase())}">
        ${featured}
        <span class="tx-badge tx-badge-cat">${getCategoryLabel(cat)}</span>
        ${thumbBlock(project)}
        <div class="tx-body">
          <h3 class="tx-title">${title}</h3>
          <p class="tx-desc">${escapeHtml(project.description || '')}</p>
          <p class="tx-tech">${escapeHtml(project.tech || '')}</p>
          ${visit ? `<div class="tx-actions">${visitOnly(visit)}</div>` : ''}
        </div>
        <div class="tx-corner" aria-hidden="true"></div>
      </article>`;
  }

  function bentoSpan(index) {
    return BENTO_PATTERN[index % BENTO_PATTERN.length];
  }

  function featuredSpan(index, total) {
    if (total === 1) return 'span-2x2';
    if (index === 0) return 'span-2x2';
    if (index === 1) return 'span-2x1';
    return 'span-1x1';
  }

  function matchesFilters(el) {
    const c = el.getAttribute('data-category');
    const title = el.getAttribute('data-title') || '';
    const tech = el.getAttribute('data-tech') || '';
    const okCat = filterCat === 'all' || c === filterCat;
    const okQ = !filterQ || title.includes(filterQ) || tech.includes(filterQ);
    return okCat && okQ;
  }

  function applyFilters() {
    const gridCards = document.querySelectorAll('#projects-grid .tx-card');
    let visible = 0;
    gridCards.forEach((el) => {
      const show = matchesFilters(el);
      el.hidden = !show;
      if (show) visible += 1;
    });

    document.querySelectorAll('#featured-row .tx-card').forEach((el) => {
      el.hidden = !matchesFilters(el);
    });

    const featVisible = [...document.querySelectorAll('#featured-row .tx-card')].some(
      (el) => !el.hidden
    );
    const featSec = document.getElementById('featured-section');
    featSec.hidden = !featVisible;

    const countEl = document.getElementById('result-count');
    countEl.textContent = visible ? `${visible} live` : '';
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

    const featSec = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSec.hidden = false;
      featRow.innerHTML = featured
        .map((p, i) =>
          transmissionCard(p, {
            featured: true,
            span: featuredSpan(i, featured.length),
          })
        )
        .join('');
    } else {
      featSec.hidden = true;
      featRow.innerHTML = '';
    }

    const all = [...projects].sort(projectSort);
    document.getElementById('projects-grid').innerHTML = all
      .map((p, i) => transmissionCard(p, { span: bentoSpan(i) }))
      .join('');

    applyFilters();
  }

  function initWaveform() {
    const root = document.getElementById('waveform-bars');
    if (!root) return;
    const count = 48;
    for (let i = 0; i < count; i += 1) {
      const bar = document.createElement('span');
      bar.className = 'wave-bar';
      bar.style.setProperty('--i', String(i));
      bar.style.setProperty('--h', `${20 + Math.random() * 80}%`);
      bar.style.animationDelay = `${(i * 0.04) % 1.2}s`;
      root.appendChild(bar);
    }
  }

  document.getElementById('search-bar').addEventListener('input', (e) => {
    filterQ = e.target.value.toLowerCase();
    applyFilters();
  });
  document.getElementById('category-filter').addEventListener('change', (e) => {
    filterCat = e.target.value;
    applyFilters();
  });

  initWaveform();

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => console.error(e));
})();
