/**
 * Standalone mock: cluster "void pulse" from allowlisted PromQL (Mimir or in-cluster Prometheus).
 *   node mock/cluster-pulse/server.js
 *   http://127.0.0.1:8099
 */
const express = require('express');
const http = require('http');
const https = require('https');
const { pulseCors } = require('./cors');

const PORT = Number(process.env.PULSE_MOCK_PORT) || 8099;
const CACHE_MS = Number(process.env.PULSE_MOCK_CACHE_MS ?? 0);
const HISTORY_CACHE_MS = Number(process.env.PULSE_MOCK_HISTORY_CACHE_MS ?? 15_000);
const HISTORY_SECONDS = Number(process.env.PULSE_MOCK_HISTORY_SEC) || 1800;
const HISTORY_STEP = Number(process.env.PULSE_MOCK_HISTORY_STEP) || 30;

const QUERIES = {
  ingressActive: 'sum(nginx_ingress_nginx_connections_active)',
  ingressWaiting: 'sum(nginx_ingress_nginx_connections_waiting)',
  ingressSwing:
    'max_over_time(sum(nginx_ingress_nginx_connections_active)[5m:30s]) - min_over_time(sum(nginx_ingress_nginx_connections_active)[5m:30s])',
  ingressVolatility:
    'stddev_over_time(sum(nginx_ingress_nginx_connections_active)[10m:30s])',
  ingressRps: 'sum(rate(nginx_ingress_nginx_http_requests_total[5m]))',
  containerCpuCores: 'sum(rate(container_cpu_usage_seconds_total[2m]))',
  telemetryScrape: 'sum(rate(scrape_samples_scraped[2m]))',
  lokiBytesPerSec: 'sum(rate(loki_distributor_bytes_received_total[5m]))',
};

const CALIBRATION = {
  ingressActive: { min: 0, max: 120 },
  ingressWaiting: { min: 0, max: 120 },
  ingressSwing: { min: 0, max: 90 },
  ingressVolatility: { min: 0, max: 40 },
  ingressRps: { min: 0, max: 6 },
  containerCpuCores: { min: 0.9, max: 1.7 },
  telemetryScrape: { min: 0, max: 80 },
  lokiBytesPerSec: { min: 0, max: 16_000 },
};

function resolvePrometheusBase() {
  if (process.env.PROMETHEUS_URL) {
    return process.env.PROMETHEUS_URL.replace(/\/$/, '');
  }
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return 'http://monitoring-stack-kube-prom-prometheus.monitoring.svc.cluster.local:9090';
  }
  return 'https://mimir.theclusterflux.com/prometheus';
}

const PROMETHEUS_BASE = resolvePrometheusBase();

let cache = { at: 0, body: null };
let historyCache = { at: 0, block: null };
const recentSamples = [];
const rollingBounds = {};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function scalarFromInstant(json) {
  if (json.status !== 'success' || !json.data?.result?.length) {
    return null;
  }
  const raw = json.data.result[0].value[1];
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function seriesFromRange(json) {
  if (json.status !== 'success' || !json.data?.result?.length) {
    return [];
  }
  const points = json.data.result[0].values || [];
  return points
    .map((p) => ({
      t: p[0],
      v: parseFloat(p[1]),
    }))
    .filter((p) => Number.isFinite(p.v));
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function normalizeFixed(key, value) {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  const { min, max } = CALIBRATION[key];
  if (max <= min) {
    return 0;
  }
  return clamp01((value - min) / (max - min));
}

/** Session min/max so quiet clusters still span the ring after ~30s of polls. */
function normalizeAdaptive(key, value) {
  const fixed = normalizeFixed(key, value);
  if (value == null || !Number.isFinite(value)) {
    return fixed;
  }
  const bounds = rollingBounds[key] || { min: value, max: value };
  bounds.min = Math.min(bounds.min, value);
  bounds.max = Math.max(bounds.max, value);
  rollingBounds[key] = bounds;

  const span = bounds.max - bounds.min;
  const minSpan = CALIBRATION[key] ? (CALIBRATION[key].max - CALIBRATION[key].min) * 0.02 : 0.01;
  if (span < minSpan) {
    return fixed;
  }
  const adaptive = clamp01((value - bounds.min) / span);
  return clamp01(adaptive * 0.65 + fixed * 0.35);
}

function normalize(key, value) {
  return normalizeAdaptive(key, value);
}

/** Slow-moving cluster load (volatility + workload, not raw connection level). */
function computeBasePulse(metrics) {
  return clamp01(
    normalizeAdaptive('ingressSwing', metrics.ingressSwing) * 0.2 +
      normalizeAdaptive('ingressVolatility', metrics.ingressVolatility) * 0.2 +
      normalizeAdaptive('containerCpuCores', metrics.containerCpuCores) * 0.28 +
      normalizeAdaptive('telemetryScrape', metrics.telemetryScrape) * 0.17 +
      normalizeAdaptive('ingressRps', metrics.ingressRps) * 0.1 +
      normalizeAdaptive('lokiBytesPerSec', metrics.lokiBytesPerSec) * 0.05
  );
}

function computeMotionPulse(metrics) {
  const prev = recentSamples.at(-1);
  recentSamples.push({ ...metrics, at: Date.now() });
  if (recentSamples.length > 60) {
    recentSamples.shift();
  }
  if (!prev) {
    return 0;
  }

  const deltas = [
    Math.abs((metrics.ingressActive ?? 0) - (prev.ingressActive ?? 0)) / 18,
    Math.abs((metrics.ingressSwing ?? 0) - (prev.ingressSwing ?? 0)) / 12,
    Math.abs((metrics.containerCpuCores ?? 0) - (prev.containerCpuCores ?? 0)) / 0.12,
    Math.abs((metrics.telemetryScrape ?? 0) - (prev.telemetryScrape ?? 0)) / 8,
    Math.abs((metrics.ingressRps ?? 0) - (prev.ingressRps ?? 0)) / 0.8,
    Math.abs((metrics.lokiBytesPerSec ?? 0) - (prev.lokiBytesPerSec ?? 0)) / 2500,
  ];

  return clamp01(Math.max(...deltas));
}

function computePulse(metrics) {
  const base = computeBasePulse(metrics);
  const motion = computeMotionPulse(metrics);
  return {
    pulse: clamp01(base * 0.35 + motion * 0.65),
    base,
    motion,
  };
}

async function promInstant(query) {
  const url = `${PROMETHEUS_BASE}/api/v1/query?query=${encodeURIComponent(query)}`;
  const json = await fetchUrl(url);
  return scalarFromInstant(json);
}

async function promRange(query) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - HISTORY_SECONDS;
  const url =
    `${PROMETHEUS_BASE}/api/v1/query_range?query=${encodeURIComponent(query)}` +
    `&start=${start}&end=${end}&step=${HISTORY_STEP}`;
  const json = await fetchUrl(url);
  return seriesFromRange(json);
}

async function loadHistoryBlock() {
  const [historySwing, historyCpu, historyScrape] = await Promise.all([
    promRange(QUERIES.ingressSwing),
    promRange(QUERIES.containerCpuCores),
    promRange(QUERIES.telemetryScrape),
  ]);

  const pulseSeries = historySwing.map((pt, i) => {
    const partial = {
      ingressSwing: pt.v,
      ingressVolatility: pt.v * 0.45,
      containerCpuCores: historyCpu[i]?.v ?? null,
      telemetryScrape: historyScrape[i]?.v ?? null,
      ingressRps: 0,
      lokiBytesPerSec: 0,
    };
    return { t: pt.t, v: computeBasePulse(partial) };
  });

  return {
    pulse: pulseSeries,
    ingressSwing: historySwing,
    containerCpuCores: historyCpu,
    telemetryScrape: historyScrape,
  };
}

async function buildPayload() {
  const keys = Object.keys(QUERIES);
  const instant = await Promise.all(
    keys.map(async (key) => [key, await promInstant(QUERIES[key])])
  );
  const metrics = Object.fromEntries(instant);
  const { pulse, base, motion } = computePulse(metrics);

  const now = Date.now();
  let history = historyCache.block;
  if (!history || now - historyCache.at >= HISTORY_CACHE_MS) {
    history = await loadHistoryBlock();
    historyCache = { at: now, block: history };
  }

  return {
    ok: true,
    channel: 'void-resonance',
    demo: false,
    source: PROMETHEUS_BASE,
    ts: new Date().toISOString(),
    pulse,
    pulseBase: base,
    pulseMotion: motion,
    metrics,
    normalized: Object.fromEntries(
      keys.map((key) => [key, normalize(key, metrics[key])])
    ),
    history,
  };
}

function demoPayload() {
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
  const { pulse, base, motion } = computePulse(metrics);
  const history = [];
  const end = Math.floor(Date.now() / 1000);
  for (let i = 60; i >= 0; i -= 1) {
    const ts = end - i * 30;
    const w = 0.5 + 0.35 * Math.sin(ts / 4);
    history.push({ t: ts, v: clamp01(0.25 + 0.65 * w) });
  }
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
    normalized: Object.fromEntries(
      Object.keys(metrics).map((key) => [key, normalize(key, metrics[key])])
    ),
    history: { pulse: history, ingressSwing: [], containerCpuCores: [], telemetryScrape: [] },
    error: 'Prometheus unreachable; showing synthetic demo waveform.',
  };
}

async function getPulsePayload() {
  const now = Date.now();
  if (cache.body && now - cache.at < CACHE_MS) {
    return cache.body;
  }
  try {
    const body = await buildPayload();
    cache = { at: now, body };
    return body;
  } catch (err) {
    console.error('[cluster-pulse mock]', err.message);
    const body = demoPayload();
    body.error = err.message;
    cache = { at: now, body };
    return body;
  }
}

const app = express();
const root = __dirname;

app.use(pulseCors);
app.use(express.static(root));

app.options('/api/pulse', (_req, res) => res.sendStatus(204));
app.get('/api/pulse', async (_req, res) => {
  try {
    const body = await getPulsePayload();
    res.json(body);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, prometheus: PROMETHEUS_BASE });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Cluster pulse mock: http://127.0.0.1:${PORT}`);
  console.log(`Prometheus base: ${PROMETHEUS_BASE}`);
});
