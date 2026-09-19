const RING_CIRC = 2 * Math.PI * 88;

const POLL_MS = Number(window.PULSE_POLL_MS) || 400;
const SPARK_CAP = 240;

const state = {
  pulse: 0.35,
  targetPulse: 0.35,
  targetMotion: 0,
  metrics: {},
  particles: [],
  sparkHistory: [],
};

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const ringFill = document.getElementById('ring-fill');
const pulsePercent = document.getElementById('pulse-percent');
const pulseBreakdown = document.getElementById('pulse-breakdown');
const statusLine = document.getElementById('status-line');
const sparkPulse = document.getElementById('spark-pulse');
const sparkCtx = sparkPulse.getContext('2d');

const metricEls = {
  ingressSwing: document.getElementById('val-ingress-swing'),
  ingressVolatility: document.getElementById('val-ingress-volatility'),
  ingressActive: document.getElementById('val-ingress-active'),
  ingressRps: document.getElementById('val-ingress-rps'),
  containerCpuCores: document.getElementById('val-cpu'),
  telemetryScrape: document.getElementById('val-scrape'),
  lokiBytesPerSec: document.getElementById('val-loki-bytes'),
  motion: document.getElementById('val-motion'),
};

const barEls = {
  ingressSwing: document.getElementById('bar-ingress-swing'),
  containerCpuCores: document.getElementById('bar-cpu'),
  telemetryScrape: document.getElementById('bar-scrape'),
};

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initParticles(count) {
  state.particles = [];
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 1 + Math.random() * 2,
      a: 0.15 + Math.random() * 0.5,
    });
  }
}

function formatNum(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(digits);
}

function updateRing(pulse, base, motion) {
  const pct = Math.round(pulse * 100);
  pulsePercent.textContent = String(pct);
  if (pulseBreakdown) {
    pulseBreakdown.textContent = `base ${Math.round((base ?? 0) * 100)} · motion ${Math.round((motion ?? 0) * 100)}`;
  }
  const offset = RING_CIRC * (1 - pulse);
  ringFill.style.strokeDasharray = `${RING_CIRC}`;
  ringFill.style.strokeDashoffset = String(offset);
  document.documentElement.style.setProperty('--glow', String(0.25 + pulse * 0.75));
}

function updateBars(normalized, metrics, motion) {
  if (barEls.ingressSwing) {
    barEls.ingressSwing.style.width = `${(normalized.ingressSwing || 0) * 100}%`;
  }
  if (barEls.containerCpuCores) {
    barEls.containerCpuCores.style.width = `${(normalized.containerCpuCores || 0) * 100}%`;
  }
  if (barEls.telemetryScrape) {
    barEls.telemetryScrape.style.width = `${(normalized.telemetryScrape || 0) * 100}%`;
  }
  metricEls.ingressSwing.textContent = formatNum(metrics.ingressSwing, 0);
  metricEls.ingressVolatility.textContent = formatNum(metrics.ingressVolatility, 1);
  metricEls.ingressActive.textContent = `${formatNum(metrics.ingressActive, 0)} / ${formatNum(metrics.ingressWaiting, 0)}`;
  metricEls.ingressRps.textContent = `${formatNum(metrics.ingressRps, 2)} /s`;
  metricEls.containerCpuCores.textContent = `${formatNum(metrics.containerCpuCores, 2)} cores`;
  metricEls.telemetryScrape.textContent = `${formatNum(metrics.telemetryScrape, 1)} /s`;
  metricEls.lokiBytesPerSec.textContent = `${formatNum(metrics.lokiBytesPerSec, 0)} B/s`;
  metricEls.motion.textContent = motion != null ? `${Math.round(motion * 100)}%` : '—';
}

function drawSparkline(series) {
  const w = sparkPulse.clientWidth;
  const h = sparkPulse.height;
  sparkCtx.clearRect(0, 0, w, h);
  if (!series?.length) {
    sparkCtx.fillStyle = 'rgba(147,197,253,0.4)';
    sparkCtx.font = '11px sans-serif';
    sparkCtx.fillText('no history', 8, h / 2 + 4);
    return;
  }
  const vals = series.map((p) => p.v).filter((v) => Number.isFinite(v));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  sparkCtx.beginPath();
  series.forEach((p, i) => {
    const x = (i / (series.length - 1 || 1)) * (w - 4) + 2;
    const y = h - 4 - ((p.v - min) / span) * (h - 8);
    if (i === 0) sparkCtx.moveTo(x, y);
    else sparkCtx.lineTo(x, y);
  });
  sparkCtx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
  sparkCtx.lineWidth = 1.5;
  sparkCtx.stroke();
  sparkCtx.lineTo(w - 2, h);
  sparkCtx.lineTo(2, h);
  sparkCtx.closePath();
  sparkCtx.fillStyle = 'rgba(96, 165, 250, 0.08)';
  sparkCtx.fill();
}

function tickParticles() {
  const speed = 0.5 + state.pulse * 2.5 + state.targetMotion * 1.8;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  for (const p of state.particles) {
    p.x += p.vx * speed;
    p.y += p.vy * speed;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.7 + state.pulse), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(96, 165, 250, ${p.a * (0.35 + state.pulse * 0.9)})`;
    ctx.fill();
  }

  const linkDist = 50 + state.pulse * 70 + state.targetMotion * 120;
  ctx.strokeStyle = `rgba(232, 121, 169, ${0.05 + state.pulse * 0.08 + state.targetMotion * 0.12})`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < state.particles.length; i += 1) {
    for (let j = i + 1; j < state.particles.length; j += 1) {
      const a = state.particles[i];
      const b = state.particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < linkDist) {
        ctx.globalAlpha = (1 - d / linkDist) * 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  state.pulse += (state.targetPulse - state.pulse) * 0.22;
  requestAnimationFrame(tickParticles);
}

function pushSparkSample(pulse) {
  state.sparkHistory.push({ t: Date.now() / 1000, v: pulse });
  if (state.sparkHistory.length > SPARK_CAP) {
    state.sparkHistory.shift();
  }
  drawSparkline(state.sparkHistory);
}

async function refresh() {
  try {
    const res = await fetch('/api/pulse');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'bad response');

    state.targetPulse = data.pulse ?? 0.35;
    state.targetMotion = data.pulseMotion ?? 0;
    state.metrics = data.metrics || {};
    updateRing(state.targetPulse, data.pulseBase, data.pulseMotion);
    updateBars(data.normalized || {}, state.metrics, data.pulseMotion);

    if (state.sparkHistory.length === 0 && data.history?.pulse?.length) {
      state.sparkHistory = data.history.pulse.slice(-SPARK_CAP);
    }
    pushSparkSample(data.pulse ?? 0.35);

    const src = data.demo ? 'DEMO (synthetic)' : 'live';
    statusLine.textContent =
      `[${data.ts}] poll=${POLL_MS}ms source=${data.source} mode=${src}${data.error ? ` err=${data.error}` : ''}`;
    statusLine.classList.toggle('demo', !!data.demo);
  } catch (err) {
    statusLine.textContent = `fetch failed: ${err.message}`;
    statusLine.classList.add('demo');
  }
}

function setupSparkCanvas() {
  const dpr = window.devicePixelRatio || 1;
  sparkPulse.width = sparkPulse.clientWidth * dpr;
  sparkPulse.height = 72 * dpr;
  sparkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  setupSparkCanvas();
});

resizeCanvas();
setupSparkCanvas();
initParticles(64);
updateRing(0.35);
tickParticles();
refresh();
setInterval(refresh, POLL_MS);
