(function () {
  const THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const VALID = ['games', 'tools', 'infrastructure'];
  const SHELF_COUNT = 2;
  const LECTERN_DURATION = 420;

  const SPINE_TONES = [
    'ms-spine--ivory',
    'ms-spine--parchment',
    'ms-spine--slate',
    'ms-spine--umber',
    'ms-spine--wine',
    'ms-spine--charcoal',
  ];

  let projectsById = new Map();
  let activeSpineId = null;
  let lecternRaf = null;

  function stopLecternAnim() {
    if (lecternRaf != null) {
      cancelAnimationFrame(lecternRaf);
      lecternRaf = null;
    }
  }

  function tweenLecternHeight(lectern, from, to, onComplete) {
    stopLecternAnim();
    lectern.removeAttribute('hidden');
    lectern.setAttribute('aria-hidden', 'false');
    lectern.style.overflow = 'hidden';
    lectern.classList.toggle('ms-lectern--open', to > 0);

    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / LECTERN_DURATION);
      const eased = 1 - (1 - t) ** 3;
      const h = from + (to - from) * eased;
      lectern.style.height = `${Math.max(0, h)}px`;
      if (t < 1) {
        lecternRaf = requestAnimationFrame(frame);
        return;
      }
      lecternRaf = null;
      if (to <= 0) {
        lectern.setAttribute('hidden', '');
        lectern.setAttribute('aria-hidden', 'true');
        lectern.classList.remove('ms-lectern--open');
        lectern.style.height = '0px';
      } else {
        lectern.style.height = 'auto';
        lectern.style.overflow = '';
      }
      if (onComplete) onComplete();
    }

    lectern.style.height = `${from}px`;
    lecternRaf = requestAnimationFrame(frame);
  }

  function showLectern(lectern) {
    stopLecternAnim();
    lectern.removeAttribute('hidden');
    lectern.classList.add('ms-lectern--open');
    lectern.style.height = 'auto';
    lectern.style.overflow = 'hidden';
    const target = lectern.offsetHeight;
    lectern.style.height = '0px';
    void lectern.offsetHeight;
    tweenLecternHeight(lectern, 0, target);
  }

  function hideLectern(lectern, done) {
    if (lectern.hasAttribute('hidden')) {
      if (done) done();
      return;
    }
    const from = lectern.offsetHeight || lectern.scrollHeight;
    tweenLecternHeight(lectern, from, 0, done);
  }

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

  function projectId(project, index) {
    const base = (project.title || 'volume').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `vol-${base}-${index}`;
  }

  function spineTone(title) {
    let h = 0;
    for (let i = 0; i < title.length; i += 1) h = (h + title.charCodeAt(i) * (i + 1)) % SPINE_TONES.length;
    return SPINE_TONES[h];
  }

  /** Vertical spine: more chars → more columns (width) and slightly more height. */
  function spineMetrics(title, featured) {
    const len = (title || '').length;
    const charsPerColumn = 8;
    const columns = Math.max(1, Math.ceil(len / charsPerColumn));
    const columnPx = 11;
    const w = Math.min(96, 32 + columns * columnPx);
    const baseH = featured ? 102 : 88;
    const h = Math.min(224, baseH + Math.max(0, columns - 1) * 8);
    return { w, h };
  }

  /** Face-out jacket: estimate wrapped lines from word lengths. */
  function coverMetrics(title) {
    const words = String(title || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const charsPerLine = 16;
    let lines = 0;
    words.forEach((word) => {
      lines += Math.max(1, Math.ceil(word.length / charsPerLine));
    });
    lines = Math.max(2, lines);
    const minH = Math.min(300, 152 + (lines - 2) * 24);
    const maxW = lines > 4 || (title || '').length > 28 ? 192 : 168;
    return { minH, maxW, lines };
  }

  function isFeatured(project) {
    return project.featured === true || project.featured === 'true';
  }

  function volumeButtons() {
    return document.querySelectorAll('button.ms-spine, button.ms-cover');
  }

  function isVolumeVisible(el) {
    return el && !el.classList.contains('ms-volume--filtered-out');
  }

  function setVolumeFiltered(el, filteredOut) {
    el.classList.toggle('ms-volume--filtered-out', filteredOut);
    el.setAttribute('aria-hidden', filteredOut ? 'true' : 'false');
    if (filteredOut) el.tabIndex = -1;
    else el.removeAttribute('tabindex');
  }

  function thumbUrl(project) {
    return project.image ? `${THUMB_BASE}${project.image}` : '';
  }

  function createCover(project, index) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const id = projectId(project, index);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const tone = spineTone(project.title);
    const noVisit = visit ? '' : ' ms-cover--sealed';
    const monogram = (project.title || 'V')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase();

    projectsById.set(id, project);
    const cover = coverMetrics(project.title);

    return `
      <button type="button" class="ms-cover ${tone}${noVisit}" role="listitem"
        id="${escapeAttr(id)}"
        data-spine-id="${escapeAttr(id)}"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}"
        style="--cover-min-h: ${cover.minH}px; --cover-max-w: ${cover.maxW}px"
        aria-label="${escapeAttr(project.title)}">
        <span class="ms-cover__frame ${tone}">
          <span class="ms-cover__stamp">${escapeHtml(getCategoryLabel(cat))}</span>
          <span class="ms-cover__face-title">${escapeHtml(project.title)}</span>
          <span class="ms-cover__rule" aria-hidden="true"></span>
          <span class="ms-cover__monogram" aria-hidden="true">${escapeHtml(monogram)}</span>
        </span>
      </button>`;
  }

  function createSpine(project, index, opts) {
    opts = opts || {};
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const id = projectId(project, index);
    const searchBlob = `${project.title} ${project.tech || ''}`.toLowerCase();
    const tone = spineTone(project.title);
    const metrics = spineMetrics(project.title, opts.featured);
    const feat = opts.featured ? ' ms-spine--featured' : '';
    const noVisit = visit ? '' : ' ms-spine--sealed';

    projectsById.set(id, project);

    return `
      <button type="button" class="ms-spine ${tone}${feat}${noVisit}" role="listitem"
        id="${escapeAttr(id)}"
        data-spine-id="${escapeAttr(id)}"
        data-category="${cat}"
        data-search="${escapeAttr(searchBlob)}"
        data-has-visit="${visit ? '1' : '0'}"
        style="--spine-h: ${metrics.h}px; --spine-w: ${metrics.w}px"
        title="${escapeAttr(project.title)}"
        aria-label="${escapeAttr(project.title)}">
        <span class="ms-spine__edge" aria-hidden="true"></span>
        <span class="ms-spine__title">${escapeHtml(project.title)}</span>
        ${opts.featured ? '<span class="ms-spine__ribbon" aria-hidden="true"></span>' : ''}
      </button>`;
  }

  function shelfHtml(books, startIndex) {
    if (!books.length) return '';
    return `
      <div class="ms-shelf">
        <div class="ms-shelf__books ms-shelf__books--spines" role="list">
          ${books.map((p, i) => createSpine(p, startIndex + i)).join('')}
        </div>
        <div class="ms-shelf__board" aria-hidden="true"></div>
      </div>`;
  }

  function splitShelves(books, shelfCount) {
    if (!books.length) return [];
    const size = Math.ceil(books.length / shelfCount);
    return chunk(books, size).slice(0, shelfCount);
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function applyFilters() {
    const cat = document.getElementById('category-filter').value;
    const q = document.getElementById('search-bar').value.toLowerCase().trim();
    let visible = 0;

    volumeButtons().forEach((el) => {
      const c = el.getAttribute('data-category');
      const blob = el.getAttribute('data-search') || '';
      const ok = (cat === 'all' || c === cat) && (!q || blob.includes(q));
      setVolumeFiltered(el, !ok);
      if (ok) visible += 1;
    });

    const empty = document.getElementById('empty-state');
    empty.hidden = visible > 0;

    if (activeSpineId) {
      const active = document.getElementById(activeSpineId);
      if (!isVolumeVisible(active)) closeDetail({ immediate: true });
    }
  }

  function fillDetail(project) {
    const cat = getCategory(project);
    const visit = getVisitUrl(project.links);
    const img = thumbUrl(project);

    document.getElementById('detail-cat').textContent = getCategoryLabel(cat);
    document.getElementById('detail-title').textContent = project.title;
    document.getElementById('detail-desc').textContent = project.description || '';
    document.getElementById('detail-tech').textContent = project.tech || '';

    const media = document.getElementById('detail-media');
    if (img) {
      media.hidden = false;
      media.innerHTML = `<img src="${escapeAttr(img)}" alt="" decoding="async">`;
    } else {
      media.hidden = true;
      media.innerHTML = '';
    }

    const actions = document.getElementById('detail-actions');
    actions.innerHTML = visit
      ? `<a class="ms-visit" href="${escapeAttr(visit)}" target="_blank" rel="noopener noreferrer">Visit</a>`
      : '<p class="ms-visit ms-visit--muted">No public edition</p>';
  }

  function placeLectern(spineId) {
    const lectern = document.getElementById('book-detail');
    const spineEl = document.getElementById(spineId);
    const shelf = spineEl && spineEl.closest('.ms-shelf');
    if (shelf) shelf.insertAdjacentElement('afterend', lectern);
    return spineEl;
  }

  function openDetail(spineId) {
    const project = projectsById.get(spineId);
    if (!project) return;

    const lectern = document.getElementById('book-detail');
    const wasOpen =
      !lectern.hasAttribute('hidden') && lectern.classList.contains('ms-lectern--open');

    const reveal = () => {
      activeSpineId = spineId;
      volumeButtons().forEach((el) => {
        const on = el.getAttribute('data-spine-id') === spineId;
        el.classList.toggle('ms-spine--open', on && el.classList.contains('ms-spine'));
        el.classList.toggle('ms-cover--open', on && el.classList.contains('ms-cover'));
      });
      fillDetail(project);
      const spineEl = placeLectern(spineId);
      showLectern(lectern);
      if (spineEl) {
        window.setTimeout(() => {
          spineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, LECTERN_DURATION * 0.35);
      }
    };

    if (wasOpen) {
      document.querySelectorAll('.ms-spine--open, .ms-cover--open').forEach((el) => {
        el.classList.remove('ms-spine--open', 'ms-cover--open');
      });
      activeSpineId = null;
      hideLectern(lectern, reveal);
    } else {
      reveal();
    }
  }

  function closeDetail(options) {
    const opts = options || {};
    activeSpineId = null;
    document.querySelectorAll('.ms-spine--open, .ms-cover--open').forEach((el) => {
      el.classList.remove('ms-spine--open', 'ms-cover--open');
    });
    const lectern = document.getElementById('book-detail');
    if (opts.immediate) {
      stopLecternAnim();
      lectern.classList.remove('ms-lectern--open');
      lectern.style.height = '0px';
      lectern.style.overflow = 'hidden';
      lectern.setAttribute('hidden', '');
      lectern.setAttribute('aria-hidden', 'true');
      if (opts.onDone) opts.onDone();
      return;
    }
    hideLectern(lectern, opts.onDone);
  }

  function bindSpineClicks(root) {
    root.addEventListener('click', (e) => {
      const vol = e.target.closest('button.ms-spine, button.ms-cover');
      if (!isVolumeVisible(vol)) return;
      const id = vol.getAttribute('data-spine-id');
      if (activeSpineId === id) closeDetail();
      else openDetail(id);
    });
  }

  function render(projects) {
    projectsById.clear();
    closeDetail({ immediate: true });

    projects.forEach((p) => {
      p.category = getCategory(p);
    });

    window.CLUSTER_THUMB_BASE = THUMB_BASE;

    const featured = projects.filter(isFeatured).sort(projectSort);
    const featTitles = new Set(featured.map((p) => p.title));
    const rest = projects.filter((p) => !featTitles.has(p.title)).sort(projectSort);

    const featSection = document.getElementById('featured-section');
    const featBooks = document.querySelector('#featured-row .ms-shelf__books');
    if (featSection && featBooks) {
      if (featured.length) {
        featSection.hidden = false;
        featBooks.className = 'ms-shelf__books ms-shelf__books--featured';
        featBooks.innerHTML = featured.map((p, i) => createCover(p, i)).join('');
      } else {
        featSection.hidden = true;
        featBooks.innerHTML = '';
      }
    }

    const shelves = splitShelves(rest, SHELF_COUNT);
    let spineIndex = featured.length;
    document.getElementById('projects-grid').innerHTML = shelves
      .map((group) => {
        const html = shelfHtml(group, spineIndex);
        spineIndex += group.length;
        return html;
      })
      .join('');

    const vol = document.getElementById('volume-count');
    if (vol) {
      vol.textContent = `${projects.length} volumes · featured face-out · two spine shelves below`;
    }

    applyFilters();
  }

  document.getElementById('search-bar').addEventListener('input', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });

  bindSpineClicks(document.body);

  fetch('/data/projects.json')
    .then((r) => r.json())
    .then(render)
    .catch(console.error);
})();
