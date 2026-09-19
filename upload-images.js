const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Set environment variables first
process.env.IS_LOCAL = 'true';
process.env.MONGO_PASSWORD = 'cUOwJiXY9S';

const IS_LOCAL = process.env.IS_LOCAL === 'true';
const MONGO_URI = IS_LOCAL
  ? `mongodb://root:${process.env.MONGO_PASSWORD}@localhost:27017`
  : `mongodb://root:${process.env.MONGO_PASSWORD}@mongodb.default.svc.cluster.local:27017`;

// Image to project mapping
const imageMappings = [
  { image: 'AccessGuard.jpeg', projects: ['Access Guard Backend', 'Access Guard Frontend'] },
  { image: 'bomberman.png', projects: ['Bomberman'] },
  { image: 'DaysSince.jpeg', projects: ['Days Since'] },
  { image: 'FinanceSuite.jpeg', projects: ['Finance suite'] },
  { image: 'InvoiceManager.png', projects: ['Invoice Manager Backend', 'Invoice Manager Frontend'] },
  { image: 'LearnHub.jpeg', projects: ['LearnHub'] }
];

async function uploadImages() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('homepage');
    const projectsCollection = db.collection('projects');
    const bucket = new GridFSBucket(db, { bucketName: 'thumbnails' });

    const imgDir = path.join(__dirname, 'img');

    for (const mapping of imageMappings) {
      const imagePath = path.join(imgDir, mapping.image);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Image not found: ${imagePath}`);
        continue;
      }

      // Get file extension
      const ext = path.extname(mapping.image).substring(1).toLowerCase();
      
      for (const projectTitle of mapping.projects) {
        // Find the project
        const project = await projectsCollection.findOne({ title: projectTitle });
        
        if (!project) {
          console.log(`⚠️  Project not found: ${projectTitle}`);
          continue;
        }

        // Create filename: replace spaces with underscores, add extension
        const filename = `${projectTitle.replace(/\s+/g, '_')}.${ext}`;
        
        // Delete existing file if it exists
        try {
          const existingFiles = await bucket.find({ filename: filename }).toArray();
          for (const file of existingFiles) {
            await bucket.delete(file._id);
            console.log(`🗑️  Deleted existing image: ${filename}`);
          }
        } catch (err) {
          // File might not exist, that's okay
        }

        // Upload new image
        const imageStream = fs.createReadStream(imagePath);
        const uploadStream = bucket.openUploadStream(filename);
        imageStream.pipe(uploadStream);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => {
            console.log(`✅ Uploaded: ${filename} for project "${projectTitle}"`);
            resolve();
          });
          uploadStream.on('error', reject);
        });

        // Update project with new image filename
        await projectsCollection.updateOne(
          { title: projectTitle },
          { $set: { image: filename, fileType: ext } }
        );
        console.log(`📝 Updated project "${projectTitle}" with image: ${filename}`);
      }
    }

    console.log('\n✨ All images uploaded successfully!');
  } catch (error) {
    console.error('❌ Error uploading images:', error);
    throw error;
  } finally {
    await client.close();
  }
}

uploadImages().catch(console.error);

