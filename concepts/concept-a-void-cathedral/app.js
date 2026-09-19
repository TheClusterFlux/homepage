(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  let allProjects = [];
  let selectedId = null;

  function getCategory(p) {
    const c = (p.category || 'tools').toLowerCase();
    return VALID.includes(c) ? c : 'tools';
  }

  function categoryFlag(cat) {
    if (cat === 'games') return '[GAMES]';
    if (cat === 'infrastructure') return '[INFRA]';
    return '[TOOLS]';
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function thumbUrl(project) {
    return project.image ? `${THUMB_BASE}${project.image}` : '';
  }

  function renderFeatured(projects) {
    const featured = projects.filter(
      (p) => p.featured === true || p.featured === 'true'
    );
    const order = ['games', 'tools', 'infrastructure'];
    featured.sort((a, b) => {
      const ai = order.indexOf(getCategory(a));
      const bi = order.indexOf(getCategory(b));
      if (ai !== bi) return ai - bi;
      return projectSort(a, b);
    });

    const sec = document.getElementById('featured-section');
    const row = document.getElementById('featured-row');
    if (!featured.length) {
      sec.hidden = true;
      row.innerHTML = '';
      return;
    }
    sec.hidden = false;
    row.innerHTML = featured
      .map((p) => {
        const cat = getCategory(p);
        const visit = getVisitUrl(p.links);
        const img = thumbUrl(p);
        const visitHtml = visit
          ? `<a class="btn-visit" href="${escapeHtml(visit)}" target="_blank" rel="noopener noreferrer">open --visit</a>`
          : '<span class="detail-no-link">no public endpoint</span>';
        return `
          <div class="featured-entry" data-id="${escapeHtml(p._id)}">
            ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">` : '<span class="dim">[no thumb]</span>'}
            <div>
              <div class="proc-title">${escapeHtml(p.title)}</div>
              <div class="dim">${escapeHtml((p.description || '').slice(0, 80))}${(p.description || '').length > 80 ? '…' : ''}</div>
              <span class="proc-flags tag-${cat}">${categoryFlag(cat)} *pinned*</span>
            </div>
            <div class="detail-actions">${visitHtml}</div>
          </div>`;
      })
      .join('');
  }

  function renderList(projects) {
    const grid = document.getElementById('projects-grid');
    const sorted = [...projects].sort(projectSort);
    grid.innerHTML = sorted
      .map((p, i) => {
        const cat = getCategory(p);
        const pid = String(1000 + i).slice(-4);
        return `
          <div class="proc-row" role="option" tabindex="0"
            data-id="${escapeHtml(p._id)}"
            data-category="${cat}"
            data-title="${escapeHtml(p.title.toLowerCase())}"
            data-tech="${escapeHtml((p.tech || '').toLowerCase())}"
            aria-selected="false">
            <span class="proc-pid">${pid}</span>
            <span class="proc-title">${escapeHtml(p.title)}</span>
            <span class="proc-flags tag-${cat}">${categoryFlag(cat)}</span>
          </div>`;
      })
      .join('');

    grid.querySelectorAll('.proc-row').forEach((row) => {
      row.addEventListener('click', () => selectProject(row.dataset.id));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProject(row.dataset.id);
        }
      });
    });

    updateStatusCount();
    applyFilters();
  }

  function selectProject(id) {
    selectedId = id;
    const project = allProjects.find((p) => p._id === id);
    const panel = document.getElementById('detail-panel');
    document.querySelectorAll('.proc-row').forEach((el) => {
      const on = el.dataset.id === id;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    if (!project) {
      panel.innerHTML = '<p class="detail-idle dim">Process not found.</p>';
      return;
    }

    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    let visitLabel = visit;
    if (visit) {
      try {
        visitLabel = new URL(visit).hostname;
      } catch (_) {
        visitLabel = visit;
      }
    }
    const visitBlock = visit
      ? `<div class="detail-actions"><a class="btn-visit" href="${escapeHtml(visit)}" target="_blank" rel="noopener noreferrer">exec visit ${escapeHtml(visitLabel)}</a></div>`
      : '<p class="detail-no-link">links.visit: (null)</p>';

    panel.innerHTML = `
      <div class="detail-frame">
        ${img ? `<div class="detail-thumb"><img src="${escapeHtml(img)}" alt=""></div>` : ''}
        <h2 class="detail-title">${escapeHtml(project.title)}</h2>
        <p class="detail-meta">${categoryFlag(cat)} · ${escapeHtml(project.author || 'unknown')}</p>
        <p class="detail-desc">${escapeHtml(project.description || '')}</p>
        <p class="detail-tech">stack: ${escapeHtml(project.tech || '—')}</p>
        ${visitBlock}
      </div>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;

    document.querySelectorAll('#projects-grid .proc-row').forEach((el) => {
      const c = el.getAttribute('data-category');
      const title = el.getAttribute('data-title') || '';
      const tech = el.getAttribute('data-tech') || '';
      const okCat = cat === 'all' || c === cat;
      const okQ = !q || title.includes(q) || tech.includes(q);
      const show = okCat && okQ;
      el.classList.toggle('is-hidden', !show);
      if (show) visible += 1;
    });

    const status = document.getElementById('status-count');
    if (status) status.textContent = `PROC: ${visible}/${allProjects.length}`;
  }

  function updateStatusCount() {
    const status = document.getElementById('status-count');
    if (status) status.textContent = `PROC: ${allProjects.length}/${allProjects.length}`;
  }

  function initClock() {
    const el = document.getElementById('status-clock');
    if (!el) return;
    function tick() {
      const d = new Date();
      el.textContent = d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
    tick();
    setInterval(tick, 1000);
  }

  function normalizeProjects(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });
    return projects;
  }

  function render(projects) {
    allProjects = normalizeProjects(projects);
    renderFeatured(allProjects);
    renderList(allProjects);
    if (allProjects.length) {
      const first = document.querySelector('#projects-grid .proc-row:not(.is-hidden)');
      if (first) selectProject(first.dataset.id);
    }
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  initClock();

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => {
      console.error(e);
      document.getElementById('projects-grid').innerHTML =
        '<p class="dim">fatal: could not load /data/projects.json</p>';
    });
})();
