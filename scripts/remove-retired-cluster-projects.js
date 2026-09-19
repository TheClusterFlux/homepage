/**
 * Remove homepage projects that are retired from the catalog.
 * Superseded by K8 Platform Guide: MCP Server (Cluster Services).
 *
 * Run from repo root with app Mongo env, then refresh cache:
 *   IS_LOCAL=true MONGO_PASSWORD=xxx node scripts/remove-retired-cluster-projects.js
 *   curl https://homepage.theclusterflux.com/api/fetch-data
 */

const { MongoClient } = require('mongodb');

const RETIRED_TITLES = ['MCP Server (Cluster Services)'];

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@localhost:27017`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017`;

async function main() {
  if (!process.env.MONGO_PASSWORD) {
    console.error('Set MONGO_PASSWORD (and IS_LOCAL=true for local Mongo).');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db('homepage').collection('projects');

  for (const title of RETIRED_TITLES) {
    const result = await col.deleteOne({ title });
    console.log(title, result.deletedCount ? 'removed' : 'not found');
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
