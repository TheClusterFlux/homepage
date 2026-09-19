/**
 * Local-only admin server for editing projects in MongoDB.
 * Binds to 127.0.0.1 only. Run when MongoDB is port-forwarded to localhost.
 *
 * 1. Copy scripts/admin-config.example.json to scripts/admin-config.json
 * 2. Set mongoUri (e.g. mongodb://root:password@localhost:27017)
 * 3. kubectl port-forward svc/mongodb 27017:27017 -n default
 * 4. node scripts/admin-server.js
 * 5. Open http://127.0.0.1:3080/admin.html
 */

const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const configPath = path.join(__dirname, 'admin-config.json');
let config;
try {
  config = require(configPath);
} catch (e) {
  console.error('Missing scripts/admin-config.json. Copy from admin-config.example.json and set mongoUri.');
  process.exit(1);
}

const MONGO_URI = config.mongoUri || 'mongodb://root:password@localhost:27017';
const PORT = config.port || 3080;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.redirect(302, '/admin.html');
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/projects', async (req, res) => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const projects = await client.db('homepage').collection('projects').find({}).toArray();
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await client.close();
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const allowed = ['title', 'description', 'tech', 'links', 'category', 'featured', 'image', 'fileType'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const _id = new ObjectId(id);
    const result = await client.db('homepage').collection('projects').updateOne(
      { _id },
      { $set: updates }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await client.close();
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const _id = new ObjectId(id);
    const result = await client.db('homepage').collection('projects').deleteOne({ _id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await client.close();
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Admin server: http://127.0.0.1:${PORT}/admin.html (local only)`);
});
