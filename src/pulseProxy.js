const http = require('http');
const { syntheticPulse } = require('./pulseSynthetic');

const CACHE_MS = Number(process.env.PULSE_API_CACHE_MS) || 20_000;
const VOID_UPSTREAM =
  process.env.PULSE_VOID_UPSTREAM || 'http://127.0.0.1:8099/api/pulse';
const MESH_UPSTREAM =
  process.env.PULSE_MESH_UPSTREAM || 'http://127.0.0.1:8100/api/pulse';

const cache = {
  'void-resonance': { at: 0, body: null },
  'mesh-echo': { at: 0, body: null },
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
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

function mountPulseRoutes(app) {
  const inCluster = Boolean(process.env.KUBERNETES_SERVICE_HOST);

  function createHandler(channel, upstream, syntheticOnly) {
    return async (_req, res) => {
      const now = Date.now();
      const slot = cache[channel];
      if (slot.body && now - slot.at < CACHE_MS) {
        res.json(slot.body);
        return;
      }
      if (syntheticOnly) {
        const body = syntheticPulse(channel);
        slot.at = now;
        slot.body = body;
        res.json(body);
        return;
      }
      try {
        const body = await fetchJson(upstream);
        slot.at = now;
        slot.body = body;
        res.json(body);
      } catch (err) {
        if (slot.body) {
          res.json(slot.body);
          return;
        }
        const body = syntheticPulse(channel);
        body.upstreamError = String(err.message || err);
        slot.at = now;
        slot.body = body;
        res.json(body);
      }
    };
  }

  const voidSyntheticOnly =
    inCluster && !process.env.PULSE_VOID_UPSTREAM && VOID_UPSTREAM.includes('127.0.0.1');
  const meshSyntheticOnly =
    inCluster && !process.env.PULSE_MESH_UPSTREAM && MESH_UPSTREAM.includes('127.0.0.1');

  app.get(
    '/api/pulse/void-resonance',
    createHandler('void-resonance', VOID_UPSTREAM, voidSyntheticOnly)
  );
  app.get('/api/pulse/mesh-echo', createHandler('mesh-echo', MESH_UPSTREAM, meshSyntheticOnly));
}

module.exports = { mountPulseRoutes };
