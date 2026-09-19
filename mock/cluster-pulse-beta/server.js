/**
 * Independent pulse channel — control plane / mesh / observability fabric (not ingress/Loki bytes).
 *   http://127.0.0.1:8100
 */
const express = require('express');
const http = require('http');
const https = require('https');
const { pulseCors } = require('../cluster-pulse/cors');

const PORT = Number(process.env.PULSE_BETA_PORT) || 8100;
const CACHE_MS = Number(process.env.PULSE_BETA_CACHE_MS ?? 0);
const HISTORY_CACHE_MS = Number(process.env.PULSE_BETA_HISTORY_CACHE_MS ?? 15_000);
const HISTORY_SECONDS = Number(process.env.PULSE_BETA_HISTORY_SEC) || 1800;
const HISTORY_STEP = Number(process.env.PULSE_BETA_HISTORY_STEP) || 30;

const QUERIES = {
  restClientRps: 'sum(rate(rest_client_requests_total[2m]))',
  workqueueAdds: 'sum(rate(workqueue_adds_total[2m]))',
  lokiQueryRps: 'sum(rate(loki_request_duration_seconds_count[5m]))',
  lokiStreams: 'sum(loki_ingester_memory_streams)',
  lokiStreamSwing:
    'max_over_time(sum(loki_ingester_memory_streams)[10m:30s]) - min_over_time(sum(loki_ingester_memory_streams)[10m:30s])',
  promhttpRps: 'sum(rate(promhttp_metric_handler_requests_total[2m]))',
  ciliumNetRx: 'sum(rate(cilium_operator_process_network_receive_bytes_total[5m]))',
  ciliumNetTx: 'sum(rate(cilium_operator_process_network_transmit_bytes_total[5m]))',
};

const CALIBRATION = {
  restClientRps: { min: 0.7, max: 1.2 },
  workqueueAdds: { min: 0, max: 0.5 },
  lokiQueryRps: { min: 0, max: 25 },
  lokiStreams: { min: 0, max: 80 },
  lokiStreamSwing: { min: 0, max: 15 },
  promhttpRps: { min: 0.5, max: 1.2 },
  ciliumNetRx: { min: 0, max: 200_000 },
  ciliumNetTx: { min: 0, max: 150_000 },
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
const CHANNEL = 'mesh-echo';

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
  const n = parseFloat(json.data.result[0].value[1]);
  return Number.isFinite(n) ? n : null;
}

function seriesFromRange(json) {
  if (json.status !== 'success' || !json.data?.result?.length) {
    return [];
  }
  return (json.data.result[0].values || [])
    .map((p) => ({ t: p[0], v: parseFloat(p[1]) }))
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
  const minSpan = (CALIBRATION[key].max - CALIBRATION[key].min) * 0.02;
  if (span < minSpan) {
    return fixed;
  }
  const adaptive = clamp01((value - bounds.min) / span);
  return clamp01(adaptive * 0.65 + fixed * 0.35);
}

function normalize(key, value) {
  return normalizeAdaptive(key, value);
}

function computeBasePulse(metrics) {
  return clamp01(
    normalizeAdaptive('ciliumNetRx', metrics.ciliumNetRx) * 0.24 +
      normalizeAdaptive('ciliumNetTx', metrics.ciliumNetTx) * 0.12 +
      normalizeAdaptive('restClientRps', metrics.restClientRps) * 0.18 +
      normalizeAdaptive('lokiQueryRps', metrics.lokiQueryRps) * 0.16 +
      normalizeAdaptive('lokiStreamSwing', metrics.lokiStreamSwing) * 0.14 +
      normalizeAdaptive('promhttpRps', metrics.promhttpRps) * 0.1 +
      normalizeAdaptive('workqueueAdds', metrics.workqueueAdds) * 0.06
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
    Math.abs((metrics.ciliumNetRx ?? 0) - (prev.ciliumNetRx ?? 0)) / 25_000,
    Math.abs((metrics.ciliumNetTx ?? 0) - (prev.ciliumNetTx ?? 0)) / 20_000,
    Math.abs((metrics.restClientRps ?? 0) - (prev.restClientRps ?? 0)) / 0.08,
    Math.abs((metrics.lokiQueryRps ?? 0) - (prev.lokiQueryRps ?? 0)) / 2,
    Math.abs((metrics.lokiStreams ?? 0) - (prev.lokiStreams ?? 0)) / 3,
    Math.abs((metrics.lokiStreamSwing ?? 0) - (prev.lokiStreamSwing ?? 0)) / 2,
    Math.abs((metrics.promhttpRps ?? 0) - (prev.promhttpRps ?? 0)) / 0.08,
    Math.abs((metrics.workqueueAdds ?? 0) - (prev.workqueueAdds ?? 0)) / 0.05,
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
  return scalarFromInstant(await fetchUrl(url));
}

async function promRange(query) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - HISTORY_SECONDS;
  const url =
    `${PROMETHEUS_BASE}/api/v1/query_range?query=${encodeURIComponent(query)}` +
    `&start=${start}&end=${end}&step=${HISTORY_STEP}`;
  return seriesFromRange(await fetchUrl(url));
}

async function loadHistoryBlock() {
  const [historyCilium, historyLokiQ] = await Promise.all([
    promRange(QUERIES.ciliumNetRx),
    promRange(QUERIES.lokiQueryRps),
  ]);

  const pulseSeries = historyCilium.map((pt, i) => {
    const partial = {
      ciliumNetRx: pt.v,
      ciliumNetTx: pt.v * 0.6,
      restClientRps: 0.95,
      lokiQueryRps: historyLokiQ[i]?.v ?? 0,
      lokiStreamSwing: 0,
      promhttpRps: 0.75,
      workqueueAdds: 0,
    };
    return { t: pt.t, v: computeBasePulse(partial) };
  });

  return { pulse: pulseSeries, ciliumNetRx: historyCilium, lokiQueryRps: historyLokiQ };
}

async function buildPayload() {
  const keys = Object.keys(QUERIES);
  const metrics = Object.fromEntries(
    await Promise.all(keys.map(async (key) => [key, await promInstant(QUERIES[key])]))
  );
  const { pulse, base, motion } = computePulse(metrics);

  const now = Date.now();
  let history = historyCache.block;
  if (!history || now - historyCache.at >= HISTORY_CACHE_MS) {
    history = await loadHistoryBlock();
    historyCache = { at: now, block: history };
  }

  return {
    ok: true,
    channel: CHANNEL,
    demo: false,
    source: PROMETHEUS_BASE,
    ts: new Date().toISOString(),
    pulse,
    pulseBase: base,
    pulseMotion: motion,
    metrics,
    normalized: Object.fromEntries(keys.map((key) => [key, normalize(key, metrics[key])])),
    history,
  };
}

function demoPayload() {
  const t = Date.now() / 1000;
  const wave = 0.5 + 0.4 * Math.sin(t / 3.3);
  const metrics = {
    restClientRps: 0.85 + 0.25 * wave,
    workqueueAdds: 0.02 + 0.2 * Math.abs(Math.sin(t / 2.1)),
    lokiQueryRps: 3 + 15 * Math.abs(Math.sin(t / 4.5)),
    lokiStreams: 18 + 20 * wave,
    lokiStreamSwing: 2 + 8 * Math.abs(Math.sin(t / 5)),
    promhttpRps: 0.65 + 0.4 * Math.abs(Math.sin(t / 1.6)),
    ciliumNetRx: 40_000 + 120_000 * Math.abs(Math.sin(t / 2.7)),
    ciliumNetTx: 30_000 + 80_000 * Math.abs(Math.sin(t / 3.1)),
  };
  const { pulse, base, motion } = computePulse(metrics);
  const history = [];
  const end = Math.floor(Date.now() / 1000);
  for (let i = 60; i >= 0; i -= 1) {
    const ts = end - i * 30;
    history.push({ t: ts, v: clamp01(0.3 + 0.5 * Math.sin(ts / 3.8)) });
  }
  return {
    ok: true,
    channel: CHANNEL,
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
    history: { pulse: history, ciliumNetRx: [], lokiQueryRps: [] },
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
    console.error('[cluster-pulse-beta]', err.message);
    const body = demoPayload();
    body.error = err.message;
    cache = { at: now, body };
    return body;
  }
}

const app = express();
app.use(pulseCors);
app.use(express.static(__dirname));

app.options('/api/pulse', (_req, res) => res.sendStatus(204));
app.get('/api/pulse', async (_req, res) => {
  try {
    res.json(await getPulsePayload());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, channel: CHANNEL, prometheus: PROMETHEUS_BASE });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Cluster pulse beta (${CHANNEL}): http://127.0.0.1:${PORT}`);
  console.log(`Prometheus base: ${PROMETHEUS_BASE}`);
});
