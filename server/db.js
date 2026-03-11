// MongoDB connection module with connection pooling for serverless
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://td_db_user:td00000000@cluster0.zhzkjdp.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'td';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'td1';

let cachedClient = null;
let cachedDb = null;
let cachedCollection = null;
let cachedRulesCollection = null;
let cachedStringConversionCollection = null;

async function connectToMongoDB() {
  // Reuse existing connection if available (for serverless)
  if (cachedClient && cachedDb) {
    return {
      client: cachedClient,
      db: cachedDb,
      collection: cachedCollection,
      rulesCollection: cachedRulesCollection,
      stringConversionCollection: cachedStringConversionCollection,
    };
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const rulesCollection = db.collection('parsing_rules');
    const stringConversionCollection = db.collection('string_conversion');

    cachedClient = client;
    cachedDb = db;
    cachedCollection = collection;
    cachedRulesCollection = rulesCollection;
    cachedStringConversionCollection = stringConversionCollection;

    console.log('✅ Connected to MongoDB');
    return {
      client,
      db,
      collection,
      rulesCollection,
      stringConversionCollection,
    };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

module.exports = { connectToMongoDB };
