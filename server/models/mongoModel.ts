import { MongoClient, ServerApiVersion, ObjectId, Db } from 'mongodb';

if (!process.env.MONGO_URI) {
  console.error('[mongoModel] MONGO_URI is not set');
  throw new Error('MONGO_URI environment variable is not set');
} else {
  console.log('[mongoModel] MONGO_URI found');
}
const client = new MongoClient(process.env.MONGO_URI!, {
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  console.log('[mongoModel] Connecting to MongoDB...');
  if (cachedDb) return cachedDb;

  try {
    await client.connect();
    console.log('[mongoModel] MongoDB connected');
    cachedDb = client.db('legal_corpus');
    return cachedDb;
  } catch (err) {
    console.error('[mongoModel] Failed to connect to MongoDB:', err);
    throw err;
  }
}

export async function findLegalCaseByTitle(titleToFind: string) {
  try {
    const db = await getDb();
    const legalDocs = db.collection('chunks');

    const result = await legalDocs.findOne(
      { caseTitle: { $regex: `^${titleToFind}$`, $options: 'i' } },
      { projection: { _id: 0, summary: 1 } }
    );

    return result;
  } catch (error) {
    console.error('MongoDB error:', error);
    throw error;
  }
}

export async function ensureTextIndexOnChunks() {
  console.log('[mongoModel] Starting ensureTextIndexOnChunks');
  const db = await getDb();
  console.log('[mongoModel] Got DB connection');

  const collection = db.collection('chunks');
  const indexes = await collection.indexes();
  console.log('[mongoModel] Retrieved indexes');

  const hasTextIndex = indexes.some(index => {
    return Object.values(index.key).includes('text');
  });

  if (!hasTextIndex) {
    await collection.createIndex({ text: 'text' });
    console.log('[mongoModel] Created text index on chunks.text');
  } else {
    console.log('[mongoModel] Text index on chunks.text already exists');
  }
}

export { ObjectId };

