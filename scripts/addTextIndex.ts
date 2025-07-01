import 'dotenv/config'; 
import { getDb } from '../server/models/mongoModel';

const createTextIndex = async () => {
  try {
    const db = await getDb();
    const collection = db.collection('chunks');

    const result = await collection.createIndex({ text: 'text' });
    console.log('✅ Text index created:', result);

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create index:', err);
    process.exit(1);
  }
};

createTextIndex();
