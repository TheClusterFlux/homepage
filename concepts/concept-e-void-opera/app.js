(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];

  const ROMAN = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
    'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
    'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
  ];

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

  function romanAct(index) {
    return ROMAN[index] || String(index + 1);
  }

  function createPrincipal(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const visitBtn = visit
      ? `<a class="principal__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '';

    return `
      <article class="principal" data-category="${cat}" style="--principal-i: ${index}">
        <div class="principal__beam" aria-hidden="true"></div>
        <div class="principal__frame">
          <div class="principal__media${img ? '' : ' no-image'}">
            ${img
        ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" onerror="this.closest('.principal__media').classList.add('no-image')">`
        : ''}
            <div class="principal__media-fallback"><span>${escapeHtml(project.title)}</span></div>
          </div>
          <div class="principal__body">
            <span class="principal__genre principal__genre--${cat}">${getCategoryLabel(cat)}</span>
            <h3 class="principal__title">${escapeHtml(project.title)}</h3>
            <p class="principal__desc">${escapeHtml(project.description || '')}</p>
            <p class="principal__tech">${escapeHtml(project.tech || '')}</p>
            ${visitBtn ? `<div class="principal__actions">${visitBtn}</div>` : ''}
          </div>
        </div>
      </article>`;
  }

  function createAct(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const visitBtn = visit
      ? `<a class="act__visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<span class="act__visit act__visit--muted">No curtain call</span>';

    return `
      <article class="act" role="listitem"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}">
        <div class="act__ornament">
          <span class="act__roman">Act ${romanAct(index)}</span>
          <span class="act__genre act__genre--${cat}">${getCategoryLabel(cat)}</span>
        </div>
        <div class="act__main">
          <div class="act__thumb${img ? '' : ' no-image'}">
            ${img
        ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" onerror="this.closest('.act__thumb').classList.add('no-image')">`
        : ''}
          </div>
          <div class="act__copy">
            <h3 class="act__title">${escapeHtml(project.title)}</h3>
            <p class="act__synopsis">${escapeHtml(project.description || '')}</p>
            <p class="act__craft">${escapeHtml(project.tech || '')}</p>
          </div>
          <div class="act__aside">${visitBtn}</div>
        </div>
        <div class="act__divider" aria-hidden="true"></div>
      </article>`;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();

    document.querySelectorAll('#projects-grid .act').forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const okCat = cat === 'all' || c === cat;
      const okQ = !q || blob.includes(q);
      el.classList.toggle('is-hidden', !(okCat && okQ));
    });

    document.querySelectorAll('#featured-row .principal').forEach((el) => {
      const c = el.getAttribute('data-category');
      const title = (el.querySelector('.principal__title')?.textContent || '').toLowerCase();
      const tech = (el.querySelector('.principal__tech')?.textContent || '').toLowerCase();
      const okCat = cat === 'all' || c === cat;
      const okQ = !q || title.includes(q) || tech.includes(q);
      el.classList.toggle('is-hidden', !(okCat && okQ));
    });

    const featSec = document.getElementById('featured-section');
    const anyPrincipal = document.querySelector('#featured-row .principal:not(.is-hidden)');
    if (featSec && !featSec.hasAttribute('data-has-featured')) {
      /* leave hidden state to render() */
    } else if (featSec) {
      featSec.hidden = !anyPrincipal;
    }
  }

  function render(projects) {
    projects.forEach((p) => {
      p.category = getCategory(p);
    });

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

    const featSec = document.getElementById('featured-section');
    const featRow = document.getElementById('featured-row');
    if (featured.length) {
      featSec.hidden = false;
      featSec.setAttribute('data-has-featured', 'true');
      featRow.innerHTML = featured
        .map((p, i) => createPrincipal(p, i))
        .join('');
      const cones = document.querySelectorAll('.spotlight-cone');
      cones.forEach((el, i) => {
        el.classList.toggle('is-active', i < featured.length);
      });
    } else {
      featSec.hidden = true;
      featSec.removeAttribute('data-has-featured');
      featRow.innerHTML = '';
    }

    const all = [...projects].sort(projectSort);
    document.getElementById('projects-grid').innerHTML = all
      .map((p, i) => createAct(p, i))
      .join('');

    applyFilters();
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch((e) => {
      console.error(e);
      document.getElementById('projects-grid').innerHTML =
        '<p class="playbill-error">The orchestra failed to load the program.</p>';
    });
})();
