import { connectToDatabase } from '../../lib/mongoose';
import Yo from '../../models/yo';

export default async function handler(req, res) {
  await connectToDatabase();

  const pop = await Yo.find({}).sort({ urlHits: -1 }).limit(10);

  res.status(200).json(pop);
}