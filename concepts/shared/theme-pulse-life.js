(function () {
  function metric(display, key, fallback) {
    const n = display.normalized?.[key];
    if (Number.isFinite(n)) return n;
    return fallback ?? 0;
  }

  function setChannelVars(root, channelId, display) {
    const p = display.pulse ?? 0.35;
    const m = display.pulseMotion ?? 0;
    const b = display.pulseBase ?? p;
    const prefix = `--pulse-${channelId}`;
    root.style.setProperty(`${prefix}-pulse`, String(p));
    root.style.setProperty(`${prefix}-motion`, String(m));
    root.style.setProperty(`${prefix}-base`, String(b));
    root.style.setProperty(`${prefix}-glow`, String(0.25 + p * 0.75));
    root.style.setProperty(`${prefix}-flicker`, String(m * 0.85));
  }

  function themeVoidExtras(theme, v, root) {
    const n = v.normalized || {};
    switch (theme) {
      case 'guilty-crown':
        root.style.setProperty('--gc-thread-speed', `${Math.max(12, 34 - v.pulse * 18)}s`);
        root.style.setProperty('--gc-animation-scale', String(0.85 + v.pulse * 0.35));
        break;
      case 'neural-terminal':
        root.style.setProperty(
          '--nt-crt',
          String(0.35 + v.pulse * 0.25 + v.pulseMotion * 0.15)
        );
        break;
      case 'crystal-cathedral':
        root.style.setProperty(
          '--cc-aurora-a',
          String(18 + (1 - v.pulse) * 14 + v.pulseMotion * 4)
        );
        break;
      case 'sakura-genome':
        root.style.setProperty(
          '--sg-bloom',
          String(16 + (1 - v.pulse) * 12 + v.pulseMotion * 3)
        );
        break;
      case 'void-opera':
        root.style.setProperty(
          '--vo-smoke-a',
          String(14 + (1 - v.pulse) * 10 + v.pulseMotion * 4)
        );
        break;
      case 'sibyl-index':
        root.style.setProperty(
          '--si-scan',
          String(8 + (1 - v.pulse) * 8 + v.pulseMotion * 3)
        );
        break;
      case 'lost-christmas':
        root.style.setProperty(
          '--lc-aurora',
          String(12 + (1 - v.pulse) * 10 + metric(v, 'ingressVolatility', n.ingressVolatility) * 4)
        );
        break;
      case 'apocalypse-ring':
        root.style.setProperty('--ar-radar', String(3.5 + (1 - v.pulse) * 5 + v.pulseMotion * 1.5));
        break;
      case 'sublevel-zero':
        root.style.setProperty(
          '--sz-hazard',
          String(6 + (1 - v.pulse) * 6 + v.pulseMotion * 2)
        );
        break;
      case 'seraph-static':
        root.style.setProperty(
          '--ss-scan',
          String(0.35 + v.pulse * 0.2 + v.pulseMotion * 0.15)
        );
        break;
      case 'dominator-lock':
        root.style.setProperty(
          '--dl-sweep',
          String(5 + (1 - v.pulse) * 5 + v.pulseMotion * 2)
        );
        break;
      case 'mwpsb-dossier':
        root.style.setProperty(
          '--md-flicker',
          String(0.4 + metric(v, 'lokiQueryRps', n.lokiQueryRps) * 0.35 + v.pulseMotion * 0.25)
        );
        break;
      case 'hue-spectrum':
        root.style.setProperty(
          '--hs-vignette',
          String(0.75 + v.pulse * 0.15 + v.pulseMotion * 0.1)
        );
        break;
      case 'makishima-shelf':
        root.style.setProperty('--ms-room', String(0.85 + v.pulse * 0.15));
        break;
      default:
        break;
    }
  }

  function themeMeshExtras(theme, m, root) {
    const n = m.normalized || {};
    switch (theme) {
      case 'guilty-crown':
        root.style.setProperty('--gc-hero-pulse', String(4 + (1 - m.pulse) * 4 + m.pulseMotion * 2));
        break;
      case 'neural-terminal':
        root.style.setProperty(
          '--nt-blink',
          String(0.65 + metric(m, 'ingressRps', n.ingressRps) * 0.35 + m.pulseMotion * 0.2)
        );
        break;
      case 'crystal-cathedral':
        root.style.setProperty(
          '--cc-aurora-b',
          String(20 + (1 - m.pulse) * 16 + metric(m, 'ingressSwing', n.ingressSwing) * 6)
        );
        break;
      case 'sakura-genome':
        root.style.setProperty(
          '--sg-petal',
          String(0.35 + metric(m, 'lokiStreamSwing', n.lokiStreamSwing) * 0.45 + m.pulse * 0.25)
        );
        break;
      case 'void-opera':
        root.style.setProperty(
          '--vo-chandelier',
          String(3.5 + (1 - m.pulse) * 3 + m.pulseMotion * 1.5)
        );
        break;
      case 'sibyl-index':
        root.style.setProperty(
          '--si-gauge',
          String(16 + (1 - m.pulse) * 12 + metric(m, 'restClientRps', n.restClientRps) * 8)
        );
        break;
      case 'lost-christmas':
        root.style.setProperty(
          '--lc-grain',
          String(0.08 + metric(m, 'ingressVolatility', n.ingressVolatility) * 0.12 + m.pulseMotion * 0.08)
        );
        break;
      case 'apocalypse-ring':
        root.style.setProperty('--ar-halo', String(1.6 + m.pulseMotion * 2.4 + m.pulse * 0.8));
        root.style.setProperty('--ar-grid', String(14 + (1 - m.pulse) * 10));
        break;
      case 'sublevel-zero':
        root.style.setProperty(
          '--sz-led',
          String(1.8 + metric(m, 'workqueueAdds', n.workqueueAdds) * 1.2 + m.pulseMotion * 0.8)
        );
        break;
      case 'seraph-static':
        root.style.setProperty(
          '--ss-glow',
          String(0.45 + m.pulse * 0.4 + metric(m, 'promhttpRps', n.promhttpRps) * 0.15)
        );
        break;
      case 'dominator-lock':
        root.style.setProperty(
          '--dl-reticle',
          String(2.4 + (1 - m.pulse) * 1.4 + metric(m, 'ingressActive', n.ingressActive) * 0.8)
        );
        break;
      case 'mwpsb-dossier':
        root.style.setProperty(
          '--md-grain',
          String(0.08 + m.pulseMotion * 0.12 + m.pulse * 0.06)
        );
        break;
      case 'hue-spectrum':
        root.style.setProperty(
          '--hs-cymatic',
          String(0.22 + m.pulse * 0.35 + m.pulseMotion * 0.25)
        );
        break;
      case 'makishima-shelf':
        root.style.setProperty('--ms-breathe-period', `${Math.max(8, 22 - m.pulse * 12)}s`);
        root.style.setProperty('--ms-lamp', String(0.2 + m.pulse * 0.45 + m.pulseMotion * 0.2));
        break;
      default:
        break;
    }
  }

  function init() {
    if (!window.ClusterPulse?.startDual) return;
    const theme = document.body?.dataset?.visualTheme || 'guilty-crown';
    const root = document.documentElement;
    root.classList.add('cluster-pulse-live');

    window.ClusterPulse.startDual({
      onFrame(voidDisplay, meshDisplay) {
        setChannelVars(root, 'void', voidDisplay);
        setChannelVars(root, 'mesh', meshDisplay);
        root.dataset.pulseVoid = (voidDisplay.pulse ?? 0).toFixed(2);
        root.dataset.pulseMesh = (meshDisplay.pulse ?? 0).toFixed(2);
        themeVoidExtras(theme, voidDisplay, root);
        themeMeshExtras(theme, meshDisplay, root);
      },
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
