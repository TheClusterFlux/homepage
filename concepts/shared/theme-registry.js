(function (global) {

  const STORAGE_KEY = 'clusterflux-visual-theme';



  /** @type {{ id: string, name: string, scheme: 'dark'|'light', previewPort: number|null, productionPath: string }[]} */

  const themes = [

    {

      id: 'guilty-crown',

      name: 'Guilty Crown',

      scheme: 'dark',

      previewPort: null,

      productionPath: '/themes/guilty-crown/',

    },

    {

      id: 'neural-terminal',

      name: 'Neural Terminal',

      scheme: 'dark',

      previewPort: 8091,

      productionPath: '/themes/neural-terminal/',

    },

    {

      id: 'crystal-cathedral',

      name: 'Crystal Cathedral',

      scheme: 'dark',

      previewPort: 8092,

      productionPath: '/themes/crystal-cathedral/',

    },

    {

      id: 'sakura-genome',

      name: 'Sakura Genome',

      scheme: 'light',

      previewPort: 8093,

      productionPath: '/themes/sakura-genome/',

    },

    {

      id: 'void-opera',

      name: 'Void Opera',

      scheme: 'dark',

      previewPort: 8094,

      productionPath: '/themes/void-opera/',

    },

    {

      id: 'sibyl-index',

      name: 'Sibyl Index',

      scheme: 'dark',

      previewPort: 8095,

      productionPath: '/themes/sibyl-index/',

    },

    {

      id: 'dominator-lock',

      name: 'Dominator Lock',

      scheme: 'dark',

      previewPort: 8120,

      productionPath: '/themes/dominator-lock/',

    },

    {

      id: 'mwpsb-dossier',

      name: 'MWPSB Dossier',

      scheme: 'dark',

      previewPort: 8122,

      productionPath: '/themes/mwpsb-dossier/',

    },

    {

      id: 'hue-spectrum',

      name: 'Hue Spectrum',

      scheme: 'dark',

      previewPort: 8102,

      productionPath: '/themes/hue-spectrum/',

    },

    {

      id: 'makishima-shelf',

      name: 'Makishima Shelf',

      scheme: 'light',

      previewPort: 8103,

      productionPath: '/themes/makishima-shelf/',

    },

    {

      id: 'sublevel-zero',

      name: 'Sublevel Zero',

      scheme: 'dark',

      previewPort: 8098,

      productionPath: '/themes/sublevel-zero/',

    },

    {

      id: 'seraph-static',

      name: 'Seraph Static',

      scheme: 'dark',

      previewPort: 8119,

      productionPath: '/themes/seraph-static/',

    },

    {

      id: 'lost-christmas',

      name: 'Lost Christmas',

      scheme: 'dark',

      previewPort: 8096,

      productionPath: '/themes/lost-christmas/',

    },

    {

      id: 'apocalypse-ring',

      name: 'Apocalypse Ring',

      scheme: 'dark',

      previewPort: 8097,

      productionPath: '/themes/apocalypse-ring/',

    },

  ];



  function isLocalPreview() {

    const h = global.location.hostname;

    return h === '127.0.0.1' || h === 'localhost';

  }



  function findTheme(id) {

    return themes.find((t) => t.id === id) || null;

  }



  function getThemeById(id) {

    return findTheme(id) || themes[0];

  }



  function isValidThemeId(id) {

    return themes.some((t) => t.id === id);

  }



  function themeFromPreviewPort() {

    const port = Number(global.location.port);

    if (!port) return null;

    const match = themes.find((t) => t.previewPort === port);

    return match ? match.id : null;

  }



  function themeFromProductionPath() {

    const path = global.location.pathname;

    if (path === '/' || path === '/index.html') return null;

    const prefix = themes.find(

      (t) => t.productionPath !== '/' && path.startsWith(t.productionPath.replace(/\/$/, ''))

    );

    return prefix ? prefix.id : null;

  }



  function isGuiltyCrownEntryPoint() {

    if (themeFromProductionPath()) return false;

    if (isLocalPreview() && themeFromPreviewPort()) return false;

    const path = global.location.pathname;

    return path === '/' || path === '/index.html';

  }



  function detectCurrentThemeId() {

    const bodyId = document.body && document.body.getAttribute('data-visual-theme');

    if (bodyId) return bodyId;



    const fromPort = themeFromPreviewPort();

    if (fromPort) return fromPort;



    const fromPath = themeFromProductionPath();

    if (fromPath) return fromPath;



    return 'guilty-crown';

  }



  function themeHref(theme) {

    if (isLocalPreview() && theme.previewPort) {

      const host = global.location.hostname || '127.0.0.1';

      return `http://${host}:${theme.previewPort}/`;

    }

    return theme.productionPath;

  }



  function assignableThemes() {
    return themes.slice();
  }

  function pickWeightedRandom() {
    const prefersDark =
      global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
    const pool = [];
    assignableThemes().forEach((t) => {
      const weight = t.scheme === (prefersDark ? 'dark' : 'light') ? 3 : 1;
      for (let i = 0; i < weight; i++) pool.push(t.id);
    });
    return pool[Math.floor(Math.random() * pool.length)] || themes[0].id;
  }



  function getSavedThemeId() {

    try {

      return global.localStorage.getItem(STORAGE_KEY);

    } catch {

      return null;

    }

  }



  function saveThemeId(id) {

    try {

      global.localStorage.setItem(STORAGE_KEY, id);

    } catch {

      /* ignore */

    }

  }



  function resolveInitialThemeId() {

    const saved = getSavedThemeId();

    if (saved && isValidThemeId(saved)) return saved;

    const picked = pickWeightedRandom();

    saveThemeId(picked);

    return picked;

  }



  global.ClusterFluxThemeRegistry = {

    STORAGE_KEY,

    themes,

    findTheme,

    getThemeById,

    isValidThemeId,

    detectCurrentThemeId,

    themeHref,

    assignableThemes,

    pickWeightedRandom,

    getSavedThemeId,

    saveThemeId,

    resolveInitialThemeId,

    isGuiltyCrownEntryPoint,

    isLocalPreview,

  };

})(typeof window !== 'undefined' ? window : global);

