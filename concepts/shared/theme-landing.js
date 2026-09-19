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

    // Root is a hop: first visit gets a random /themes/* assignment; Guilty Crown only if chosen in the switcher.
    if (id === 'guilty-crown') return;

    window.location.replace(R.themeHref(R.getThemeById(id)));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLanding);
  } else {
    runLanding();
  }
})();