import validUrl from 'valid-url';

import { connectToDatabase } from '../../lib/mongoose';
import Yo from '../../models/yo';

import logger from '../../lib/logger'

export default async function handler(req, res) {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Connect to the database
  await connectToDatabase();

  const { originalUrl, linkName, updatedAt } = req.body;

  // Validate if the provided URL is valid
  if (!validUrl.isUri(originalUrl)) {
    logger.warn(`The provided URL for ${linkName} is improperly formatted: ${originalUrl}`);
    return res.status(400).json({ error: 'The provided URL is improperly formatted.' });
  }

  try {
    // Check if a Yo with the same linkName already exists
    const urlData = await Yo.findOne({ linkName: { $eq: linkName } });

    if (urlData) {
      logger.warn(`Could not create a Yo alias as the name is already in-use: ${linkName}`);
      return res.status(409).json({ error: 'This name is already in-use. Please select another name.' });
    }

    // If not, create a new short URL
    const shortUrl = `${process.env.SHORT_BASE_URL}/${linkName}`;
    const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };

    // Save the new Yo to the database
    const item = new Yo(itemToBeSaved);
    await item.save();

    logger.info(`New Yo alias created: ${linkName} -> ${originalUrl}`);

    // Respond with the newly created item
    return res.status(201).json(itemToBeSaved);
  } catch (error) {
    logger.error(`Error saving Yo alias:${linkName} -> ${originalUrl} to database: ${error}`);
    return res.status(500).json({
      originalUrl,
      shortUrl: process.env.SHORT_BASE_URL,
      linkName,
      updatedAt,
      status: 'Failed',
    });
  }
}