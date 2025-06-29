import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not set');
}

const client = new MongoClient(process.env.MONGO_URI!, {
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function findLegalCaseByTitle(titleToFind: string) {
  try {
    await client.connect();
    const legalDocs = client.db('legal_corpus').collection('cases');

    const result = await legalDocs.findOne(
      { caseTitle: { $regex: `^${titleToFind}$`, $options: 'i' } },
      { projection: { _id: 0, summary: 1 } }
    );

    return result;
  } catch (error) {
    console.error('MongoDB error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function connectToDatabase() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
  } catch (err) {
    console.error('MongoDB connection error:', err);
  } finally {
    await client.close();
  }
}

connectToDatabase();

export { ObjectId, findLegalCaseByTitle };
