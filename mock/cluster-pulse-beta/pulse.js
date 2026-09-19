const RING_CIRC = 2 * Math.PI * 88;
const POLL_MS = Number(window.PULSE_POLL_MS) || 400;
const SPARK_CAP = 240;

const PARTICLE_RGB = '52, 211, 153';
const LINK_RGB = '245, 158, 11';
const SPARK_STROKE = 'rgba(52, 211, 153, 0.85)';
const SPARK_FILL = 'rgba(52, 211, 153, 0.08)';

const state = {
  pulse: 0.35,
  targetPulse: 0.35,
  targetMotion: 0,
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
  ciliumRx: document.getElementById('val-cilium-rx'),
  ciliumTx: document.getElementById('val-cilium-tx'),
  rest: document.getElementById('val-rest'),
  lokiQ: document.getElementById('val-loki-q'),
  lokiStreams: document.getElementById('val-loki-streams'),
  promWq: document.getElementById('val-prom-wq'),
  motion: document.getElementById('val-motion'),
};

const barEls = {
  ciliumRx: document.getElementById('bar-cilium-rx'),
  lokiQ: document.getElementById('bar-loki-q'),
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
  pulsePercent.textContent = String(Math.round(pulse * 100));
  if (pulseBreakdown) {
    pulseBreakdown.textContent = `base ${Math.round((base ?? 0) * 100)} · motion ${Math.round((motion ?? 0) * 100)}`;
  }
  ringFill.style.strokeDasharray = `${RING_CIRC}`;
  ringFill.style.strokeDashoffset = String(RING_CIRC * (1 - pulse));
  document.documentElement.style.setProperty('--glow', String(0.25 + pulse * 0.75));
}

function updateBars(normalized, metrics, motion) {
  if (barEls.ciliumRx) {
    barEls.ciliumRx.style.width = `${(normalized.ciliumNetRx || 0) * 100}%`;
  }
  if (barEls.lokiQ) {
    barEls.lokiQ.style.width = `${(normalized.lokiQueryRps || 0) * 100}%`;
  }
  metricEls.ciliumRx.textContent = `${formatNum(metrics.ciliumNetRx, 0)} B/s`;
  metricEls.ciliumTx.textContent = `${formatNum(metrics.ciliumNetTx, 0)} B/s`;
  metricEls.rest.textContent = `${formatNum(metrics.restClientRps, 2)} /s`;
  metricEls.lokiQ.textContent = `${formatNum(metrics.lokiQueryRps, 1)} /s`;
  metricEls.lokiStreams.textContent = `${formatNum(metrics.lokiStreams, 0)} · Δ${formatNum(metrics.lokiStreamSwing, 0)}`;
  metricEls.promWq.textContent = `${formatNum(metrics.promhttpRps, 2)} / ${formatNum(metrics.workqueueAdds, 3)}`;
  metricEls.motion.textContent = motion != null ? `${Math.round(motion * 100)}%` : '—';
}

function drawSparkline(series) {
  const w = sparkPulse.clientWidth;
  const h = sparkPulse.height;
  sparkCtx.clearRect(0, 0, w, h);
  if (!series?.length) return;
  const vals = series.map((p) => p.v).filter(Number.isFinite);
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
  sparkCtx.strokeStyle = SPARK_STROKE;
  sparkCtx.lineWidth = 1.5;
  sparkCtx.stroke();
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
    ctx.fillStyle = `rgba(${PARTICLE_RGB}, ${p.a * (0.35 + state.pulse * 0.9)})`;
    ctx.fill();
  }

  const linkDist = 50 + state.pulse * 70 + state.targetMotion * 120;
  ctx.strokeStyle = `rgba(${LINK_RGB}, ${0.05 + state.pulse * 0.08 + state.targetMotion * 0.12})`;
  for (let i = 0; i < state.particles.length; i += 1) {
    for (let j = i + 1; j < state.particles.length; j += 1) {
      const a = state.particles[i];
      const b = state.particles[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
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
  if (state.sparkHistory.length > SPARK_CAP) state.sparkHistory.shift();
  drawSparkline(state.sparkHistory);
}

async function refresh() {
  try {
    const res = await fetch('/api/pulse');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'bad response');
    state.targetPulse = data.pulse ?? 0.35;
    state.targetMotion = data.pulseMotion ?? 0;
    updateRing(state.targetPulse, data.pulseBase, data.pulseMotion);
    updateBars(data.normalized || {}, data.metrics || {}, data.pulseMotion);
    if (state.sparkHistory.length === 0 && data.history?.pulse?.length) {
      state.sparkHistory = data.history.pulse.slice(-SPARK_CAP);
    }
    pushSparkSample(data.pulse ?? 0.35);
    statusLine.textContent = `[${data.channel}] ${data.ts} · poll ${POLL_MS}ms`;
  } catch (err) {
    statusLine.textContent = `fetch failed: ${err.message}`;
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initParticles(64);
updateRing(0.35);
tickParticles();
refresh();
setInterval(refresh, POLL_MS);
