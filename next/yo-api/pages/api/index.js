import { connectToDatabase } from '../../lib/mongoose';
import Yo from '../../models/yo';

export default async function handler(req, res) {
  await connectToDatabase();

  const yoUrls = await Yo.find().sort({ linkName: 1 });

  res.status(200).json(yoUrls);
}