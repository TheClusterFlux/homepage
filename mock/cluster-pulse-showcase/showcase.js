const POLL_MS = 400;
const RING_CIRC = 2 * Math.PI * 52;

const ALPHA_URL = window.ALPHA_PULSE_URL || 'http://127.0.0.1:8099/api/pulse';
const BETA_URL = window.BETA_PULSE_URL || 'http://127.0.0.1:8100/api/pulse';

class PulseChannel {
  constructor(root, config) {
    this.root = root;
    this.apiUrl = config.apiUrl;
    this.theme = config.theme;
    this.title = config.title;
    this.subtitle = config.subtitle;
    this.metricRows = config.metricRows;
    this.sparkStroke = config.sparkStroke;
    this.particleRgb = config.particleRgb;
    this.linkRgb = config.linkRgb;

    this.state = {
      pulse: 0.3,
      targetPulse: 0.3,
      targetMotion: 0,
      particles: [],
      spark: [],
    };

    this.renderShell();
    this.initParticles(36);
    this.loopParticles();
    this.poll();
    setInterval(() => this.poll(), POLL_MS);
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  renderShell() {
    this.root.className = `channel theme-${this.theme}`;
    this.root.innerHTML = `
      <canvas class="channel-canvas" aria-hidden="true"></canvas>
      <div class="channel-body">
        <header class="channel-head">
          <h2>${this.title}</h2>
          <p>${this.subtitle}</p>
        </header>
        <div class="ring-row">
          <div class="ring-mini">
            <svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" cx="60" cy="60" r="52"/></svg>
            <div class="ring-center">
              <span class="ring-pct" data-pct>—</span>
              <span class="ring-sub" data-breakdown>—</span>
            </div>
          </div>
          <div class="spark-mini"><canvas data-spark height="56"></canvas></div>
        </div>
        <div class="metrics-mini" data-metrics></div>
        <footer class="channel-foot" data-status>…</footer>
      </div>`;

    this.canvas = this.root.querySelector('.channel-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ringFill = this.root.querySelector('.ring-fill');
    this.pctEl = this.root.querySelector('[data-pct]');
    this.breakEl = this.root.querySelector('[data-breakdown]');
    this.spark = this.root.querySelector('[data-spark]');
    this.sparkCtx = this.spark.getContext('2d');
    this.metricsEl = this.root.querySelector('[data-metrics]');
    this.statusEl = this.root.querySelector('[data-status]');
  }

  resizeCanvas() {
    const rect = this.root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bounds = { w: rect.width, h: rect.height };
  }

  initParticles(n) {
    const w = this.bounds?.w || 300;
    const h = this.bounds?.h || 400;
    this.state.particles = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 1 + Math.random() * 1.5,
      a: 0.2 + Math.random() * 0.4,
    }));
  }

  format(n, d = 1) {
    if (n == null || !Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`;
    return n.toFixed(d);
  }

  updateMetrics(data) {
    const m = data.metrics || {};
    const html = this.metricRows
      .map(([label, key, fmt]) => {
        const val = m[key];
        const text = fmt ? fmt(val, this.format) : this.format(val);
        return `<span>${label}</span><span>${text}</span>`;
      })
      .join('');
    this.metricsEl.innerHTML = html;
  }

  updateRing(pulse, base, motion) {
    this.pctEl.textContent = String(Math.round(pulse * 100));
    this.breakEl.textContent = `b${Math.round((base || 0) * 100)} m${Math.round((motion || 0) * 100)}`;
    this.ringFill.style.strokeDasharray = `${RING_CIRC}`;
    this.ringFill.style.strokeDashoffset = String(RING_CIRC * (1 - pulse));
  }

  drawSpark() {
    const series = this.state.spark;
    const w = this.spark.clientWidth;
    const h = 56;
    this.sparkCtx.clearRect(0, 0, w, h);
    if (series.length < 2) return;
    const vals = series.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    this.sparkCtx.beginPath();
    series.forEach((p, i) => {
      const x = (i / (series.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((p.v - min) / span) * (h - 6);
      if (i === 0) this.sparkCtx.moveTo(x, y);
      else this.sparkCtx.lineTo(x, y);
    });
    this.sparkCtx.strokeStyle = this.sparkStroke;
    this.sparkCtx.lineWidth = 1.5;
    this.sparkCtx.stroke();
  }

  loopParticles() {
    const { w, h } = this.bounds || { w: 300, h: 400 };
    const speed = 0.45 + this.state.pulse * 2.2 + this.state.targetMotion * 1.5;
    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.state.particles) {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r * (0.6 + this.state.pulse), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.particleRgb}, ${p.a * (0.3 + this.state.pulse)})`;
      this.ctx.fill();
    }

    const linkDist = 45 + this.state.pulse * 60 + this.state.targetMotion * 80;
    this.ctx.strokeStyle = `rgba(${this.linkRgb}, ${0.04 + this.state.pulse * 0.1})`;
    for (let i = 0; i < this.state.particles.length; i += 1) {
      for (let j = i + 1; j < this.state.particles.length; j += 1) {
        const a = this.state.particles[i];
        const b = this.state.particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          this.ctx.globalAlpha = (1 - d / linkDist) * 0.45;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }
    this.ctx.globalAlpha = 1;
    this.state.pulse += (this.state.targetPulse - this.state.pulse) * 0.2;
    requestAnimationFrame(() => this.loopParticles());
  }

  async poll() {
    try {
      const res = await fetch(this.apiUrl);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'bad response');
      this.state.targetPulse = data.pulse ?? 0.3;
      this.state.targetMotion = data.pulseMotion ?? 0;
      this.updateRing(data.pulse, data.pulseBase, data.pulseMotion);
      this.updateMetrics({
        ...data,
        metrics: { ...(data.metrics || {}), pulseMotion: data.pulseMotion },
      });
      this.state.spark.push({ t: Date.now(), v: data.pulse });
      if (this.state.spark.length > 180) this.state.spark.shift();
      this.drawSpark();
      this.statusEl.textContent = `${data.channel || 'pulse'} · ${data.ts}`;
    } catch (err) {
      this.statusEl.textContent = `error: ${err.message}`;
    }
  }
}

document.getElementById('panel-alpha') &&
  new PulseChannel(document.getElementById('panel-alpha'), {
    apiUrl: ALPHA_URL,
    theme: 'alpha',
    title: 'Void resonance',
    subtitle: 'Ingress turbulence · container CPU · Loki ingest · scrape cadence',
    sparkStroke: 'rgba(96, 165, 250, 0.9)',
    particleRgb: '96, 165, 250',
    linkRgb: '232, 121, 169',
    metricRows: [
      ['Swing', 'ingressSwing', (v, f) => f(v, 0)],
      ['CPU', 'containerCpuCores', (v, f) => `${f(v, 2)} c`],
      ['HTTP', 'ingressRps', (v, f) => `${f(v, 2)}/s`],
      ['Motion', 'pulseMotion', (v, f) => `${Math.round((v ?? 0) * 100)}%`],
    ],
  });

document.getElementById('panel-beta') &&
  new PulseChannel(document.getElementById('panel-beta'), {
    apiUrl: BETA_URL,
    theme: 'beta',
    title: 'Mesh echo',
    subtitle: 'Cilium operator · REST client · Loki queries · prom handlers',
    sparkStroke: 'rgba(52, 211, 153, 0.9)',
    particleRgb: '52, 211, 153',
    linkRgb: '245, 158, 11',
    metricRows: [
      ['Cilium RX', 'ciliumNetRx', (v, f) => `${f(v, 0)} B/s`],
      ['Loki Q', 'lokiQueryRps', (v, f) => `${f(v, 1)}/s`],
      ['REST', 'restClientRps', (v, f) => `${f(v, 2)}/s`],
      ['Motion', 'pulseMotion', (v, f) => `${Math.round((v ?? 0) * 100)}%`],
    ],
  });
