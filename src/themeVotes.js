const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@localhost:27017`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017`;

const VALID_THEME_IDS = new Set([
  'guilty-crown',
  'neural-terminal',
  'crystal-cathedral',
  'sakura-genome',
  'void-opera',
  'sibyl-index',
  'dominator-lock',
  'mwpsb-dossier',
  'hue-spectrum',
  'makishima-shelf',
  'sublevel-zero',
  'seraph-static',
  'lost-christmas',
  'apocalypse-ring',
]);

const IP_SALT = process.env.THEME_VOTE_IP_SALT || 'clusterflux-theme-vote-v1';

let indexReady = false;

function hashIp(ip) {
  if (!ip) return null;
  const raw = String(ip).replace(/^::ffff:/, '');
  return crypto.createHash('sha256').update(`${IP_SALT}:${raw}`).digest('hex').slice(0, 24);
}

function normalizeVoterId(voterId) {
  if (typeof voterId !== 'string') return null;
  const id = voterId.trim();
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  return id.toLowerCase();
}

async function withDb(fn) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('homepage');
    const collection = db.collection('theme_votes');
    if (!indexReady) {
      await collection.createIndex({ voterId: 1 }, { unique: true });
      await collection.createIndex({ ipBucket: 1 });
      indexReady = true;
    }
    return await fn(collection);
  } finally {
    await client.close();
  }
}

async function getVoteSummary(voterId) {
  return withDb(async (collection) => {
    const rows = await collection
      .aggregate([{ $group: { _id: '$themeId', count: { $sum: 1 } } }])
      .toArray();

    const totals = {};
    let totalVotes = 0;
    for (const row of rows) {
      if (!row._id) continue;
      totals[row._id] = row.count;
      totalVotes += row.count;
    }

    let yourVote = null;
    const norm = normalizeVoterId(voterId);
    if (norm) {
      const doc = await collection.findOne({ voterId: norm }, { projection: { themeId: 1 } });
      yourVote = doc?.themeId ?? null;
    }

    return { ok: true, totals, totalVotes, yourVote };
  });
}

async function castVote({ voterId, themeId, ipBucket }) {
  const normVoter = normalizeVoterId(voterId);
  if (!normVoter) {
    return { ok: false, status: 400, error: 'Invalid voter id' };
  }
  if (!VALID_THEME_IDS.has(themeId)) {
    return { ok: false, status: 400, error: 'Invalid theme id' };
  }

  return withDb(async (collection) => {
    const existingByVoter = await collection.findOne({ voterId: normVoter });
    if (existingByVoter) {
      await collection.updateOne(
        { voterId: normVoter },
        { $set: { themeId, votedAt: new Date(), ipBucket: ipBucket || existingByVoter.ipBucket } }
      );
      return { ok: true, updated: true, yourVote: themeId };
    }

    if (ipBucket) {
      const ipCollision = await collection.findOne({ ipBucket, voterId: { $ne: normVoter } });
      if (ipCollision) {
        return {
          ok: false,
          status: 409,
          error: 'A vote was already recorded from this network. Clear site data only if that was you.',
        };
      }
    }

    try {
      await collection.insertOne({
        voterId: normVoter,
        themeId,
        votedAt: new Date(),
        ipBucket: ipBucket || null,
      });
    } catch (err) {
      if (err.code === 11000) {
        return { ok: false, status: 409, error: 'You already voted from this browser.' };
      }
      throw err;
    }

    return { ok: true, updated: false, yourVote: themeId };
  });
}

function mountThemeVoteRoutes(app) {
  app.get('/api/theme-votes', async (req, res) => {
    try {
      const summary = await getVoteSummary(req.query.voterId);
      res.json(summary);
    } catch (err) {
      console.error('GET /api/theme-votes:', err);
      res.status(503).json({ ok: false, error: 'Vote service unavailable' });
    }
  });

  app.post('/api/theme-votes', async (req, res) => {
    try {
      const themeId = req.body?.themeId;
      const voterId = req.body?.voterId;
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        '';
      const result = await castVote({ voterId, themeId, ipBucket: hashIp(ip) });
      if (!result.ok) {
        res.status(result.status || 400).json(result);
        return;
      }
      const summary = await getVoteSummary(voterId);
      res.json({ ...summary, updated: result.updated });
    } catch (err) {
      console.error('POST /api/theme-votes:', err);
      res.status(503).json({ ok: false, error: 'Vote service unavailable' });
    }
  });
}

module.exports = { mountThemeVoteRoutes, VALID_THEME_IDS };
