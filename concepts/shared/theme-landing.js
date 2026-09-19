(function () {
  function runLanding() {
    const R = window.ClusterFluxThemeRegistry;
    if (!R) return;

    // Preview ports and /themes/* — stay on the page the user opened (no auto-bounce).
    if (!R.isGuiltyCrownEntryPoint()) {
      return;
    }

    let id = R.getSavedThemeId();
    if (!id || !R.isValidThemeId(id)) {
      id = R.resolveInitialThemeId();
    }

    window.location.replace(R.themeHref(R.getThemeById(id)));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLanding);
  } else {
    runLanding();
  }
})();