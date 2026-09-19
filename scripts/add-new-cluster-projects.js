/**
 * One-time script: insert new cluster projects into MongoDB (no images).
 * Uses same env as app: MONGO_PASSWORD, IS_LOCAL.
 *
 * Run from repo root: IS_LOCAL=true MONGO_PASSWORD=xxx node scripts/add-new-cluster-projects.js
 */

const { MongoClient } = require('mongodb');

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@localhost:27017`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017`;

const NEW_PROJECTS = [
  {
    title: 'Email',
    description: 'Mail server (Postfix, Dovecot), Email API, and webmail (Roundcube). Mail server and webmail client for the cluster.',
    author: 'TheClusterFlux',
    tech: 'Python, FastAPI, Dovecot, Postfix, MySQL, Roundcube',
    links: {
      source: 'https://github.com/TheClusterFlux/mail-server',
      visit: 'https://mail.theclusterflux.com',
      'Webmail (Roundcube)': 'https://mail-client.theclusterflux.com',
    },
    category: 'infrastructure',
    fileType: 'webp',
  },
  {
    title: 'Excalidraw',
    description: 'Collaborative whiteboard for sketching and diagrams.',
    author: 'TheClusterFlux',
    tech: 'React, TypeScript',
    links: {
      source: 'https://github.com/TheClusterFlux/excalidraw',
      visit: 'https://excalidraw.theclusterflux.com',
    },
    category: 'tools',
    fileType: 'webp',
  },
  {
    title: 'Game of Life',
    description: 'Real-time multiplayer Conway\'s Game of Life with Trystero synchronization.',
    author: 'TheClusterFlux',
    tech: 'Node.js, Express, Trystero',
    links: {
      source: 'https://github.com/TheClusterFlux/GameOfLife',
      visit: 'https://game-of-life.theclusterflux.com',
    },
    category: 'games',
    fileType: 'webp',
  },
  {
    title: 'MCP Server (Cluster Services)',
    description: 'MCP server for discovering and interacting with cluster services in the Kubernetes cluster.',
    author: 'TheClusterFlux',
    tech: 'TypeScript, Node.js, Express, Kubernetes client, MCP SDK',
    links: {
      source: 'https://github.com/TheClusterFlux/mcp-server-cluster-services',
      visit: 'https://mcp-cluster-services.theclusterflux.com',
    },
    category: 'infrastructure',
    fileType: 'webp',
  },
  {
    title: 'MySQL',
    description: 'MySQL database service for other services on the cluster to use.',
    author: 'TheClusterFlux',
    tech: 'MySQL',
    links: {
      source: 'https://github.com/TheClusterFlux/mysql',
    },
    category: 'infrastructure',
    fileType: 'webp',
  },
  {
    title: 'Tic Tac Toe',
    description: '3D Tic Tac Toe multiplayer game with WebSockets.',
    author: 'TheClusterFlux',
    tech: 'Node.js, Express, WebSockets',
    links: {
      source: 'https://github.com/TheClusterFlux/3DTicTacToe',
      visit: 'https://tictactoe.theclusterflux.com',
    },
    category: 'games',
    fileType: 'webp',
  },
  {
    title: 'Mine Mayhem',
    description: 'Multiplayer Minesweeper-style game with real-time sync.',
    author: 'TheClusterFlux',
    tech: 'Next.js, React, TypeScript, Tailwind, Socket.io, Node.js, Express, MongoDB',
    links: {
      source: 'https://github.com/TheClusterFlux/MineMayhem',
      visit: 'https://minemayhem.theclusterflux.com',
    },
    category: 'games',
    fileType: 'webp',
  },
  {
    title: 'Pipbot',
    description: 'WhatsApp bot and leaderboard UI for Pips game scores.',
    author: 'TheClusterFlux',
    tech: 'Node.js, WhatsApp Web.js, MongoDB, Next.js, React, TypeScript, Tailwind',
    links: {
      source: 'https://github.com/TheClusterFlux/pipbot',
      visit: 'https://pips.theclusterflux.com',
    },
    category: 'tools',
    fileType: 'webp',
  },
];

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

    const existing = await projects.find({}, { projection: { title: 1 } }).toArray();
    const existingTitles = new Set(existing.map((p) => p.title));

    const toInsert = NEW_PROJECTS.filter((p) => !existingTitles.has(p.title));
    if (toInsert.length === 0) {
      console.log('All new projects already exist in DB. Nothing to insert.');
      return;
    }

    const result = await projects.insertMany(toInsert);
    console.log(`Inserted ${result.insertedCount} project(s):`);
    toInsert.forEach((p) => console.log(`  - ${p.title}`));
  } catch (err) {
    console.error('Insert failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
