import { MongoClient, ServerApiVersion, ObjectId, Db } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not set');
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
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db('legal_corpus');
  return cachedDb;
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

export { ObjectId };

