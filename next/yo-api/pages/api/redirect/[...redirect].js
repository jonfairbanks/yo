import { connectToDatabase } from '../../../lib/mongoose';
import Yo from '../../../models/yo';

import logger from '../../../lib/logger';

export default async function handler(req, res) {
  await connectToDatabase();

  const { redirect } = req.query;

  try {
      const item = await Yo.findOneAndUpdate(
          { linkName: redirect },
          { $inc: { urlHits: 1 }, $set: { lastAccess: Date.now() } },
          { new: true } // Return the updated document
      );

      if (item) {
          logger.info(`User loaded ${item.originalUrl} as alias: ${redirect}`);
          res.redirect(item.originalUrl);
          return
      }

      logger.warn(`Unable to find any entries for: ${redirect}`);
      res.status(404).json({ error: `Unable to find any entries for: ${redirect}` })
      return
  } catch (error) {
      logger.error(`There was an error while searching database for: ${redirect}: ${error}`);
      res.status(500).json({ error: `${error}` })
      return
  }
}