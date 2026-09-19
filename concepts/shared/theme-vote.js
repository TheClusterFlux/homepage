(function () {
  const R = window.ClusterFluxThemeRegistry;
  if (!R) return;

  const VOTER_KEY = 'clusterflux-voter-id';
  const VOTED_KEY = 'clusterflux-theme-voted';

  function getVoterId() {
    try {
      let id = localStorage.getItem(VOTER_KEY);
      if (id && /^[a-f0-9-]{36}$/i.test(id)) return id.toLowerCase();
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
      return id;
    } catch {
      return null;
    }
  }

  function themeName(id) {
    return R.getThemeById(id).name;
  }

  function sortedResults(totals, totalVotes) {
    return R.themes
      .map((t) => ({
        id: t.id,
        name: t.name,
        count: totals[t.id] || 0,
        pct: totalVotes ? Math.round(((totals[t.id] || 0) / totalVotes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function buildWidget() {
    const currentId = R.detectCurrentThemeId();
    const currentName = themeName(currentId);
    const voterId = getVoterId();

    const root = document.createElement('aside');
    root.className = 'cf-theme-vote';
    root.setAttribute('data-open', 'false');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cf-theme-vote__trigger';
    trigger.innerHTML =
      '<span class="cf-theme-vote__icon" aria-hidden="true"></span>' +
      '<span class="cf-theme-vote__label">Theme vote</span>';

    const panel = document.createElement('div');
    panel.className = 'cf-theme-vote__panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Theme popularity poll');
    panel.setAttribute('hidden', '');

    root.appendChild(panel);
    root.appendChild(trigger);

    function setOpen(open) {
      root.setAttribute('data-open', open ? 'true' : 'false');
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }

    trigger.addEventListener('click', () => {
      setOpen(root.getAttribute('data-open') !== 'true');
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.body.appendChild(root);

    return { root, panel, trigger, voterId, currentId, currentName, setOpen };
  }

  function renderPreVote(panel, ctx, onVote) {
    panel.innerHTML = `
      <p class="cf-theme-vote__title">Community poll</p>
      <p class="cf-theme-vote__lead">Vote for <strong>${escapeHtml(ctx.currentName)}</strong> as your favourite look. Results unlock after you vote.</p>
      <button type="button" class="cf-theme-vote__cta">Vote for this theme</button>
      <p class="cf-theme-vote__fine">One vote per browser · random anonymous id · no account</p>
      <p class="cf-theme-vote__error" hidden></p>`;

    const btn = panel.querySelector('.cf-theme-vote__cta');
    const errEl = panel.querySelector('.cf-theme-vote__error');

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      errEl.hidden = true;
      try {
        await onVote(ctx.currentId);
      } catch (msg) {
        errEl.textContent = String(msg);
        errEl.hidden = false;
        btn.disabled = false;
      }
    });
  }

  function renderResults(panel, ctx, data, onChange) {
    const rows = sortedResults(data.totals || {}, data.totalVotes || 0);
    const yourVote = data.yourVote;

    const rowsHtml = rows
      .filter((r) => r.count > 0 || r.id === yourVote)
      .slice(0, 14)
      .map((r) => {
        const you = r.id === yourVote ? ' cf-theme-vote__row-name--you' : '';
        const label = r.id === yourVote ? `${escapeHtml(r.name)} · you` : escapeHtml(r.name);
        return `
          <div class="cf-theme-vote__row">
            <span class="cf-theme-vote__row-name${you}">${label}</span>
            <span class="cf-theme-vote__row-pct">${r.pct}%</span>
            <div class="cf-theme-vote__bar"><span style="width:${r.pct}%"></span></div>
          </div>`;
      })
      .join('');

    panel.innerHTML = `
      <p class="cf-theme-vote__title">Community results</p>
      <p class="cf-theme-vote__lead">Thanks — here is how everyone is voting.</p>
      <div class="cf-theme-vote__results">${rowsHtml || '<p class="cf-theme-vote__fine">No votes yet.</p>'}</div>
      <p class="cf-theme-vote__total">${data.totalVotes || 0} vote${data.totalVotes === 1 ? '' : 's'} total</p>
      <button type="button" class="cf-theme-vote__change">Change my vote</button>
      <p class="cf-theme-vote__error" hidden></p>`;

    panel.querySelector('.cf-theme-vote__change').addEventListener('click', () => {
      onChange();
    });
  }

  function renderPickTheme(panel, ctx, onVote) {
    const options = R.themes
      .map(
        (t) =>
          `<button type="button" class="cf-theme-vote__cta" data-theme-id="${escapeAttr(t.id)}" style="margin-bottom:0.35rem">` +
          `Vote for ${escapeHtml(t.name)}</button>`
      )
      .join('');

    panel.innerHTML = `
      <p class="cf-theme-vote__title">Change vote</p>
      <p class="cf-theme-vote__lead">Pick your favourite theme.</p>
      ${options}
      <p class="cf-theme-vote__error" hidden></p>`;

    const errEl = panel.querySelector('.cf-theme-vote__error');
    panel.querySelectorAll('[data-theme-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        panel.querySelectorAll('[data-theme-id]').forEach((b) => {
          b.disabled = true;
        });
        errEl.hidden = true;
        try {
          await onVote(btn.getAttribute('data-theme-id'));
        } catch (msg) {
          errEl.textContent = String(msg);
          errEl.hidden = false;
          panel.querySelectorAll('[data-theme-id]').forEach((b) => {
            b.disabled = false;
          });
        }
      });
    });
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

  async function fetchSummary(voterId) {
    const q = voterId ? `?voterId=${encodeURIComponent(voterId)}` : '';
    const res = await fetch(`/api/theme-votes${q}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Could not load votes');
    return data;
  }

  async function postVote(voterId, themeId) {
    const res = await fetch('/api/theme-votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId, themeId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Vote failed');
    try {
      localStorage.setItem(VOTED_KEY, '1');
    } catch {
      /* ignore */
    }
    return data;
  }

  async function init() {
    const ctx = buildWidget();
    if (!ctx.voterId) {
      ctx.panel.innerHTML =
        '<p class="cf-theme-vote__lead">Votes need local storage in this browser.</p>';
      return;
    }

    let summary;
    try {
      summary = await fetchSummary(ctx.voterId);
    } catch {
      ctx.panel.innerHTML =
        '<p class="cf-theme-vote__lead">Vote tally is offline right now. Try again later.</p>';
      return;
    }

    const hasVoted = Boolean(summary.yourVote);

    async function handleVote(themeId) {
      const data = await postVote(ctx.voterId, themeId);
      summary = data;
      renderResults(ctx.panel, ctx, summary, () => renderPickTheme(ctx.panel, ctx, handleVote));
      ctx.trigger.querySelector('.cf-theme-vote__label').textContent = 'Results';
      ctx.setOpen(true);
    }

    if (hasVoted) {
      renderResults(ctx.panel, ctx, summary, () => renderPickTheme(ctx.panel, ctx, handleVote));
      ctx.trigger.querySelector('.cf-theme-vote__label').textContent = 'Results';
    } else {
      renderPreVote(ctx.panel, ctx, handleVote);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
