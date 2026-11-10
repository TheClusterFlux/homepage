const host = process.env.IS_LOCAL === 'true' ? 'localhost' : 'mongodb.default.svc.cluster.local';
const connectionURI = process.env.MONGODB_URI ||
    'mongodb://root:' + encodeURIComponent(process.env.MONGO_PASSWORD || '') + '@' + host + ':27017';
const databaseName = process.env.MONGO_DB_NAME || 'homepage';
module.exports = { connectionURI, databaseName };
