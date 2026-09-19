(function () {
  const R = window.ClusterFluxThemeRegistry;
  if (!R) return;

  function buildDock() {
    const currentId = R.detectCurrentThemeId();
    const current = R.getThemeById(currentId);

    const dock = document.createElement('div');
    dock.className = 'cf-theme-dock';
    dock.setAttribute('data-open', 'false');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cf-theme-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.innerHTML =
      '<span class="cf-theme-trigger__icon" aria-hidden="true"></span>' +
      '<span class="cf-theme-trigger__label">Theme</span>';

    const panel = document.createElement('ul');
    panel.className = 'cf-theme-panel';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Visual theme');

    const title = document.createElement('li');
    title.className = 'cf-theme-panel__title';
    title.textContent = 'Visual theme';
    title.setAttribute('aria-hidden', 'true');
    panel.appendChild(title);

    R.themes.forEach((theme) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cf-theme-option';
      btn.setAttribute('role', 'option');
      btn.dataset.themeId = theme.id;
      if (theme.id === currentId) {
        btn.setAttribute('aria-current', 'true');
      }
      btn.innerHTML =
        '<span class="cf-theme-option__name">' +
        theme.name +
        '</span>' +
        '<span class="cf-theme-option__meta">' +
        theme.scheme +
        '</span>';

      btn.addEventListener('click', () => {
        R.saveThemeId(theme.id);
        const href = R.themeHref(theme);
        if (theme.id === currentId) {
          close();
          return;
        }
        window.location.href = href;
      });

      li.appendChild(btn);
      panel.appendChild(li);
    });

    function open() {
      dock.setAttribute('data-open', 'true');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function close() {
      dock.setAttribute('data-open', 'false');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', () => {
      if (dock.getAttribute('data-open') === 'true') close();
      else open();
    });

    document.addEventListener('click', (e) => {
      if (!dock.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    dock.appendChild(panel);
    dock.appendChild(trigger);
    document.body.appendChild(dock);

    trigger.title = `Theme: ${current.name}`;
  }

  function loadThemeVote() {
    if (document.querySelector('link[data-cf-theme-vote]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/shared/theme-vote.css';
    link.setAttribute('data-cf-theme-vote', '1');
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = '/shared/theme-vote.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      buildDock();
      loadThemeVote();
    });
  } else {
    buildDock();
    loadThemeVote();
  }
})();
