const { fetchAndSaveHomepageData } = require('./src/dataManagement');

// Set environment variables
process.env.IS_LOCAL = 'true';
process.env.MONGO_PASSWORD = 'cUOwJiXY9S';

async function main() {
  console.log('Fetching thumbnails from MongoDB...');
  await fetchAndSaveHomepageData();
  console.log('Done!');
}

main().catch(console.error);
