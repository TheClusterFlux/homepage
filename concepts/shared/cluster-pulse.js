(function (global) {
  const POLL_MS = 2000;
  const LERP = 0.12;
  const DECAY = 0.985;
  const VOID_PORT = 8099;
  const MESH_PORT = 8100;

  function isLocalHost() {
    const h = global.location?.hostname || '';
    return h === 'localhost' || h === '127.0.0.1';
  }

  function pulseUrl(channel) {
    if (isLocalHost()) {
      const port = channel === 'mesh-echo' ? MESH_PORT : VOID_PORT;
      return `http://127.0.0.1:${port}/api/pulse`;
    }
    return `/api/pulse/${channel}`;
  }

  function emptyState() {
    return {
      pulse: 0.35,
      pulseBase: 0.35,
      pulseMotion: 0,
      metrics: {},
      normalized: {},
      ok: false,
    };
  }

  function lerpObj(display, target, k) {
    for (const key of ['pulse', 'pulseBase', 'pulseMotion']) {
      const t = target[key] ?? 0;
      const d = display[key] ?? 0;
      display[key] = d + (t - d) * k;
    }
    const tMetrics = target.metrics || {};
    if (!display.metrics) display.metrics = {};
    for (const mk of Object.keys(tMetrics)) {
      const cur = display.metrics[mk] ?? tMetrics[mk];
      display.metrics[mk] = cur + (tMetrics[mk] - cur) * k;
    }
    const tNorm = target.normalized || {};
    if (!display.normalized) display.normalized = {};
    for (const nk of Object.keys(tNorm)) {
      const cur = display.normalized[nk] ?? tNorm[nk];
      display.normalized[nk] = cur + (tNorm[nk] - cur) * k;
    }
  }

  function createChannel(url) {
    const target = emptyState();
    let failStreak = 0;

    async function poll() {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!data || !data.ok) throw new Error('pulse not ok');
        target.pulse = Number(data.pulse) || 0;
        target.pulseBase = Number(data.pulseBase) ?? target.pulse;
        target.pulseMotion = Number(data.pulseMotion) || 0;
        target.metrics = { ...(data.metrics || {}) };
        target.normalized = { ...(data.normalized || {}) };
        target.ok = true;
        failStreak = 0;
      } catch {
        failStreak += 1;
        target.pulseMotion *= DECAY;
        if (failStreak > 8) {
          target.pulse += (0.22 - target.pulse) * 0.02;
        }
      }
    }

    return {
      target,
      poll,
      failStreak: () => failStreak,
    };
  }

  function start(options) {
    const channel = options.channel || 'void-resonance';
    const url = options.url || pulseUrl(channel);
    const onFrame = options.onFrame || function () {};
    const pollMs = options.pollMs ?? POLL_MS;
    const lerpK = options.lerp ?? LERP;

    const ch = createChannel(url);
    const display = emptyState();
    let pollTimer = null;
    let rafId = null;

    function frame() {
      const k = ch.failStreak() > 0 ? lerpK * 0.65 : lerpK;
      lerpObj(display, ch.target, k);
      onFrame(display, ch.target, { channel, url, failStreak: ch.failStreak() });
      rafId = global.requestAnimationFrame(frame);
    }

    ch.poll();
    pollTimer = global.setInterval(ch.poll, pollMs);
    rafId = global.requestAnimationFrame(frame);

    return function stop() {
      if (pollTimer) global.clearInterval(pollTimer);
      if (rafId) global.cancelAnimationFrame(rafId);
    };
  }

  function startDual(options) {
    const voidUrl = options.voidUrl || pulseUrl('void-resonance');
    const meshUrl = options.meshUrl || pulseUrl('mesh-echo');
    const onFrame = options.onFrame || function () {};
    const pollMs = options.pollMs ?? POLL_MS;
    const lerpK = options.lerp ?? LERP;

    const voidCh = createChannel(voidUrl);
    const meshCh = createChannel(meshUrl);
    const voidDisplay = emptyState();
    const meshDisplay = emptyState();
    let pollTimer = null;
    let rafId = null;

    function frame() {
      const kVoid = voidCh.failStreak() > 0 ? lerpK * 0.65 : lerpK;
      const kMesh = meshCh.failStreak() > 0 ? lerpK * 0.65 : lerpK;
      lerpObj(voidDisplay, voidCh.target, kVoid);
      lerpObj(meshDisplay, meshCh.target, kMesh);
      onFrame(voidDisplay, meshDisplay, {
        void: { url: voidUrl, failStreak: voidCh.failStreak() },
        mesh: { url: meshUrl, failStreak: meshCh.failStreak() },
      });
      rafId = global.requestAnimationFrame(frame);
    }

    voidCh.poll();
    meshCh.poll();
    pollTimer = global.setInterval(() => {
      voidCh.poll();
      meshCh.poll();
    }, pollMs);
    rafId = global.requestAnimationFrame(frame);

    return function stop() {
      if (pollTimer) global.clearInterval(pollTimer);
      if (rafId) global.cancelAnimationFrame(rafId);
    };
  }

  global.ClusterPulse = {
    start,
    startDual,
    pulseUrl,
    POLL_MS,
    LERP,
  };
})(typeof window !== 'undefined' ? window : globalThis);
