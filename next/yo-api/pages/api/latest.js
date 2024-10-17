import { connectToDatabase } from '../../lib/mongoose';
import Yo from '../../models/yo';

export default async function handler(req, res) {
    await connectToDatabase();

    const rec = await Yo.find({}).sort({ lastAccess: -1 }).limit(10);
    
    return res.status(200).json(rec);
}