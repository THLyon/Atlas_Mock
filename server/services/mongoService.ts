import { getDb } from '../models/mongoModel.ts';

export const getRawSectionById = async (sectionId: string): Promise<string> => {
  const db = await getDb();
  const doc = await db.collection('rawSections').findOne({ id: sectionId });
  return doc?.text || '';
};