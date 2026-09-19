/**
 * Upload PNG app icons to GridFS and attach to projects by title.
 * Requires MongoDB reachable at localhost (port-forward) or in-cluster URI.
 *
 * Usage:
 *   IS_LOCAL=true MONGO_PASSWORD=xxx node scripts/upload-app-icons.js <icons-directory>
 */

const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

const SLUG_TO_TITLE = {
  'habit-tracker': 'Habit Tracker',
  homepage: 'homepage',
  'db-sentry': 'DB Sentry',
  'replay-hub': 'Replay Hub',
  'le-cloud': 'Le Cloud',
  'finance-suite': 'Finance Suite',
  'access-guard': 'Access Guard',
  'invoice-manager': 'Invoice Manager',
  'days-since': 'Days Since',
  learnhub: 'LearnHub',
  excalidraw: 'Excalidraw',
  pipbot: 'Pipbot',
  'cv-generator': 'CV Generator',
  'ani-me': 'Ani-Me',
  money: 'Money',
  archive: 'Archive',
  bomberman: 'Bomberman',
  'game-of-life': 'Game of Life',
  'tic-tac-toe': 'Tic Tac Toe',
  'mine-mayhem': 'Mine Mayhem',
  'monty-hall': 'Monty Hall',
  moviedle: 'Moviedle',
  'roller-phone': 'Roller Phone',
  'rps-royal': 'RPS Royal',
  mongodb: 'MongoDB',
  sqlite: 'sqlite',
  email: 'Email',
  'mcp-server-cluster-services': 'MCP Server (Cluster Services)',
  mysql: 'MySQL',
  'k8-platform-guide': 'K8 Platform Guide',
};

const SKIP_SLUGS = new Set(['moltbot']);

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@127.0.0.1:27017/?directConnection=true`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017/?directConnection=true`;

async function uploadFile(bucket, projectsCollection, title, imagePath) {
  const ext = path.extname(imagePath).substring(1).toLowerCase() || 'png';
  const project = await projectsCollection.findOne({ title });
  if (!project) {
    console.warn(`⚠️  Project not found: "${title}"`);
    return false;
  }

  const filename = `${title.replace(/\s+/g, '_')}.${ext}`;
  const existing = await bucket.find({ filename }).toArray();
  for (const file of existing) {
    await bucket.delete(file._id);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(imagePath)
      .pipe(bucket.openUploadStream(filename))
      .on('finish', resolve)
      .on('error', reject);
  });

  await projectsCollection.updateOne(
    { title },
    { $set: { image: filename, fileType: ext } }
  );
  console.log(`✅ ${title} → ${filename}`);
  return true;
}

async function main() {
  const iconsDir = process.argv[2];
  if (!iconsDir || !fs.existsSync(iconsDir)) {
    console.error('Usage: node scripts/upload-app-icons.js <icons-directory>');
    process.exit(1);
  }
  if (!process.env.MONGO_PASSWORD) {
    console.error('MONGO_PASSWORD is required.');
    process.exit(1);
  }

  const files = fs.readdirSync(iconsDir).filter((f) => /\.png$/i.test(f));
  if (files.length === 0) {
    console.error('No PNG files in directory.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('homepage');
    const projectsCollection = db.collection('projects');
    const bucket = new GridFSBucket(db, { bucketName: 'thumbnails' });

    let uploaded = 0;
    let skipped = 0;

    for (const file of files.sort()) {
      const base = path.basename(file, path.extname(file));
      const slugMatch = base.match(/^\d+-(.+)$/);
      const slug = slugMatch ? slugMatch[1] : base;

      if (SKIP_SLUGS.has(slug)) {
        console.log(`⏭️  Skip removed project slug: ${slug}`);
        skipped++;
        continue;
      }

      const title = SLUG_TO_TITLE[slug];
      if (!title) {
        console.warn(`⚠️  No title mapping for slug "${slug}" (${file})`);
        skipped++;
        continue;
      }

      const ok = await uploadFile(
        bucket,
        projectsCollection,
        title,
        path.join(iconsDir, file)
      );
      if (ok) uploaded++;
      else skipped++;
    }

    console.log(`\nDone. Uploaded: ${uploaded}, skipped: ${skipped}.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
