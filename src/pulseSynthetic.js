function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function voidResonanceSynthetic() {
  const t = Date.now() / 1000;
  const wave = 0.5 + 0.35 * Math.sin(t / 4.1) + 0.2 * Math.sin(t / 1.7);
  const metrics = {
    ingressActive: 25 + 55 * wave,
    ingressWaiting: 20 + 50 * wave,
    ingressSwing: 10 + 45 * Math.abs(Math.sin(t / 3.2)),
    ingressVolatility: 8 + 22 * (0.5 + 0.5 * Math.sin(t / 5.5)),
    ingressRps: 1.5 + 2.5 * Math.abs(Math.sin(t / 2.8)),
    containerCpuCores: 1.15 + 0.35 * (0.5 + 0.5 * Math.sin(t / 6)),
    telemetryScrape: 5 + 40 * Math.abs(Math.sin(t / 1.9)),
    lokiBytesPerSec: 5000 + 6000 * (0.5 + 0.5 * Math.sin(t / 7)),
  };
  const pulse = clamp01(0.25 + 0.65 * wave);
  const base = clamp01(0.28 + 0.5 * (0.5 + 0.5 * Math.sin(t / 8)));
  const motion = clamp01(Math.abs(Math.sin(t / 2.2)) * 0.85);
  return {
    ok: true,
    channel: 'void-resonance',
    demo: true,
    source: 'synthetic',
    ts: new Date().toISOString(),
    pulse,
    pulseBase: base,
    pulseMotion: motion,
    metrics,
    normalized: {
      ingressActive: clamp01(metrics.ingressActive / 120),
      ingressSwing: clamp01(metrics.ingressSwing / 80),
      ingressVolatility: clamp01(metrics.ingressVolatility / 40),
      ingressRps: clamp01(metrics.ingressRps / 5),
      containerCpuCores: clamp01(metrics.containerCpuCores / 4),
      telemetryScrape: clamp01(metrics.telemetryScrape / 60),
    },
  };
}

function meshEchoSynthetic() {
  const t = Date.now() / 1000;
  const wave = 0.5 + 0.4 * Math.sin(t / 3.3);
  const metrics = {
    restClientRps: 0.85 + 0.25 * wave,
    workqueueAdds: 0.02 + 0.2 * Math.abs(Math.sin(t / 2.1)),
    lokiQueryRps: 3 + 15 * Math.abs(Math.sin(t / 4.5)),
    lokiStreamSwing: 2 + 8 * Math.abs(Math.sin(t / 5)),
    promhttpRps: 0.65 + 0.4 * Math.abs(Math.sin(t / 1.6)),
    ciliumNetRx: 40_000 + 120_000 * Math.abs(Math.sin(t / 2.7)),
  };
  const pulse = clamp01(0.22 + 0.58 * wave);
  const base = clamp01(0.26 + 0.48 * (0.5 + 0.5 * Math.sin(t / 7.5)));
  const motion = clamp01(Math.abs(Math.cos(t / 1.9)) * 0.9);
  return {
    ok: true,
    channel: 'mesh-echo',
    demo: true,
    source: 'synthetic',
    ts: new Date().toISOString(),
    pulse,
    pulseBase: base,
    pulseMotion: motion,
    metrics,
    normalized: {
      restClientRps: clamp01(metrics.restClientRps / 2),
      workqueueAdds: clamp01(metrics.workqueueAdds / 0.5),
      lokiQueryRps: clamp01(metrics.lokiQueryRps / 25),
      lokiStreamSwing: clamp01(metrics.lokiStreamSwing / 12),
      promhttpRps: clamp01(metrics.promhttpRps / 2),
    },
  };
}

function syntheticPulse(channel) {
  return channel === 'mesh-echo' ? meshEchoSynthetic() : voidResonanceSynthetic();
}

module.exports = { syntheticPulse };
