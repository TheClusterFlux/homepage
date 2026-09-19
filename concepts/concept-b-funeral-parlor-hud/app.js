(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];
  const VARIANTS = ['prism', 'wide', 'tall', 'shard', 'compact'];

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

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function slabVariant(project, index, featured) {
    if (featured) return 'wide';
    const h = hashStr(project._id || project.title || String(index));
    return VARIANTS[h % VARIANTS.length];
  }

  function slantFor(project, index) {
    const h = hashStr((project.title || '') + index);
    const deg = ((h % 21) - 10) / 10;
    return deg.toFixed(2);
  }

  function createSlab(project, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const variant = slabVariant(project, opts.index ?? 0, opts.featured);
    const slant = slantFor(project, opts.index ?? 0);
    const driftDelay = ((hashStr(project.title) % 80) / 10).toFixed(1);
    const img = project.image ? `${THUMB_BASE}${project.image}` : '';
    const luminous = opts.featured ? ' slab--luminous' : '';
    const muted = visit ? '' : ' slab--muted';

    const beacon = opts.featured
      ? '<span class="slab__beacon">Luminary</span>'
      : '';

    const visitBtn = visit
      ? `<a class="slab__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    return `
      <article class="slab slab--${variant}${luminous}${muted} is-entering"
        data-category="${cat}"
        data-search="${escapeAttr((project.title + ' ' + (project.tech || '')).toLowerCase())}"
        style="--slant: ${slant}deg; --drift-delay: -${driftDelay}s">
        <span class="slab__facet" aria-hidden="true"></span>
        <div class="slab__media${img ? '' : ' no-image'}">
          ${img ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" onerror="this.closest('.slab__media').classList.add('no-image')">` : ''}
          <div class="slab__fallback"><span>${escapeHtml(project.title)}</span></div>
        </div>
        <div class="slab__body">
          <div class="slab__meta">
            <span class="slab__realm slab__realm--${cat}">${getCategoryLabel(cat)}</span>
            ${beacon}
          </div>
          <h3 class="slab__title">${escapeHtml(project.title)}</h3>
          <p class="slab__desc">${escapeHtml(project.description || '')}</p>
          <p class="slab__tech">${escapeHtml(project.tech || '')}</p>
          <div class="slab__actions">${visitBtn}</div>
        </div>
      </article>`;
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

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    document.querySelectorAll('.slab').forEach((el) => {
      const c = el.getAttribute('data-category');
      const searchBlob = el.getAttribute('data-search') || '';
      const okCat = cat === 'all' || c === cat;
      const okQ = !q || searchBlob.includes(q);
      el.dataset.hidden = okCat && okQ ? 'false' : 'true';
    });
  }

  function staggerReveal(root) {
    const slabs = root.querySelectorAll('.slab.is-entering');
    slabs.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('is-visible');
        el.classList.remove('is-entering');
      }, 40 + i * 45);
    });
  }

  function initParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx;
      targetY = ny;
    });

    function tick() {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      document.documentElement.style.setProperty('--parallax-x', currentX.toFixed(4));
      document.documentElement.style.setProperty('--parallax-y', currentY.toFixed(4));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
        .map((p, i) => createSlab(p, { featured: true, index: i }))
        .join('');
      staggerReveal(featRow);
    } else {
      featSec.hidden = true;
    }

    const all = [...projects].sort(projectSort);
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = all.map((p, i) => createSlab(p, { index: i })).join('');
    staggerReveal(grid);
    applyFilters();
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  initParallax();

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => console.error(e));
})();
