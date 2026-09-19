/**
 * One-time migration: set category (games|tools|infrastructure) and optional featured
 * on all projects in MongoDB. Uses same env as app: MONGO_PASSWORD, IS_LOCAL.
 *
 * Run from repo root: node scripts/add-project-categories.js
 * Or with env: IS_LOCAL=true MONGO_PASSWORD=yourpass node scripts/add-project-categories.js
 */

const { MongoClient } = require('mongodb');
const path = require('path');

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@localhost:27017`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017`;

// title (exact) -> { category, featured? }
const PROJECT_CATEGORIES = {
  'MongoDB': { category: 'infrastructure', featured: true },
  'Replay Hub Bot': { category: 'infrastructure' },
  'Replay Hub API': { category: 'infrastructure' },
  'Habit Tracker': { category: 'tools' },
  'Susca Watts': { category: 'tools' },
  'sqlite': { category: 'infrastructure' },
  'homepage': { category: 'tools' },
  'DB Sentry': { category: 'tools' },
  'replay hub ui': { category: 'games', featured: true },
  'Le Cloud': { category: 'tools' },
  'Finance suite': { category: 'tools', featured: true },
  'Access Guard Backend': { category: 'infrastructure' },
  'Access Guard Frontend': { category: 'tools' },
  'Frik Invoice BFF': { category: 'infrastructure' },
  'Frik Invoice Frontend': { category: 'tools' },
  'Invoice Manager Backend': { category: 'infrastructure' },
  'Invoice Manager Frontend': { category: 'tools' },
  'Bomberman': { category: 'games' },
  'Days Since': { category: 'tools' },
  'LearnHub': { category: 'tools' },
};

async function run() {
  if (!process.env.MONGO_PASSWORD) {
    console.error('MONGO_PASSWORD is required.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('homepage');
    const projects = db.collection('projects');

    const all = await projects.find({}).toArray();
    let updated = 0;
    let skipped = 0;

    for (const doc of all) {
      const title = doc.title;
      const config = PROJECT_CATEGORIES[title];
      if (!config) {
        console.warn(`No category mapping for "${title}" – skipping.`);
        skipped++;
        continue;
      }

      const update = { $set: { category: config.category } };
      if (config.featured !== undefined) {
        update.$set.featured = config.featured;
      }
      const result = await projects.updateOne({ _id: doc._id }, update);
      if (result.modifiedCount) {
        console.log(`Updated: "${title}" -> category: ${config.category}${config.featured ? ', featured: true' : ''}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`Done. Updated: ${updated}, skipped/unchanged: ${skipped}.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
