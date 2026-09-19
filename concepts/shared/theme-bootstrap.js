(function () {
  function runLanding() {
    const R = window.ClusterFluxThemeRegistry;
    if (!R) return;

    if (!R.isGuiltyCrownEntryPoint()) {
      return;
    }

    let id = R.getSavedThemeId();
    if (!id || !R.isValidThemeId(id)) {
      id = R.resolveInitialThemeId();
    }

    if (id === 'guilty-crown') return;

    window.location.replace(R.themeHref(R.getThemeById(id)));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLanding);
  } else {
    runLanding();
  }
})();