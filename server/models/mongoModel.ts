import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not set');
}

const client = new MongoClient(process.env.MONGO_URI!, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: false, // important if your connection has custom root certs or VPN
});

// const logs = client.db('logs').collection('logs');

async function findMovie(titleToFind: string) {
  try {
    // Connect to the MongoDB server
    await client.connect();
    
    // Get database and collection
    const movies = client.db('sample_mflix').collection('movies');

    // Perform the query
    const titleQueryResult = await movies.findOne(
      { title: { $regex: `^${titleToFind}$`, $options: 'i' } },
      { projection: { _id: 0, plot: 1 } }
    );

    console.log(`plot from mongoDB: 
      ${titleQueryResult?.plot}`);

    return titleQueryResult;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    // Close the connection when done
    await client.close();
  }
}

async function connectToDatabase() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    // console.log('successfully connected to mongodb')
  } catch (err) {
    console.error('MongoDB connection error:');
    console.dir(err);
  } finally {
    await client.close();
  }
}

connectToDatabase();

export { ObjectId, findMovie /*, logs */ };
