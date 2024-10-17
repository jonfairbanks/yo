import { connectToDatabase } from '../../lib/mongoose';
import Yo from '../../models/yo';

export default async function handler(req, res) {
  await connectToDatabase();

  const hitsData = await Yo.find({}, { urlHits: 1, _id: 0 }).sort({ urlHits: -1 });
  
  let hits = 0;
  hitsData.forEach(data => {
      if (data.urlHits) {
          hits += data.urlHits;
      }
  });

  return res.status(200).json({
      totalYos: hitsData.length,
      totalHits: hits,
  });
}