(function () {
  const DEFAULT_THUMB_BASE = 'https://homepage.theclusterflux.com/thumbnails/';
  const loaded = new Set();
  const inflight = new Set();

  function thumbBase() {
    const b = window.CLUSTER_THUMB_BASE || DEFAULT_THUMB_BASE;
    return b.endsWith('/') ? b : `${b}/`;
  }

  function urlForImage(image) {
    if (!image || !String(image).trim()) return null;
    return `${thumbBase()}${image}`;
  }

  function preloadOne(url) {
    if (!url || loaded.has(url) || inflight.has(url)) return Promise.resolve();
    inflight.add(url);
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      const finish = () => {
        inflight.delete(url);
        loaded.add(url);
        resolve();
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = url;
    });
  }

  function preloadProjectThumbs(projects, baseOverride) {
    const base = baseOverride
      ? baseOverride.endsWith('/')
        ? baseOverride
        : `${baseOverride}/`
      : thumbBase();
    const urls = [];
    (projects || []).forEach((p) => {
      const u = p && p.image ? `${base}${p.image}` : null;
      if (u) urls.push(u);
    });
    const unique = [...new Set(urls)];
    let i = 0;
    const concurrency = 5;

    function pump() {
      if (i >= unique.length) return Promise.resolve();
      const batch = [];
      for (let c = 0; c < concurrency && i < unique.length; c += 1) {
        batch.push(preloadOne(unique[i]));
        i += 1;
      }
      return Promise.all(batch).then(pump);
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        pump().catch(() => {});
      });
    } else {
      setTimeout(() => {
        pump().catch(() => {});
      }, 0);
    }
  }

  function maybePreloadFromResponse(url, response) {
    if (!response || !response.ok) return;
    if (!/projects\.json/i.test(String(url))) return;
    response
      .clone()
      .json()
      .then((projects) => {
        if (Array.isArray(projects)) preloadProjectThumbs(projects);
      })
      .catch(() => {});
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    return nativeFetch(input, init).then((response) => {
      maybePreloadFromResponse(url, response);
      return response;
    });
  };

  window.ClusterThumbPreload = {
    preloadProjectThumbs,
    preloadOne,
    isLoaded: (url) => loaded.has(url),
  };
})();
