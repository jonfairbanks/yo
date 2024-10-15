import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import validUrl from 'valid-url';
import logger from '../services/logger';

import Yo from '../models/yo';

mongoose.Promise = Promise;

interface YoDocument {
    originalUrl: string;
    shortUrl: string;
    linkName: string;
    updatedAt: Date;
    createdAt: Date;
    lastAccess: Date;
    urlHits: number;
}

// Events that the server can send to the client
interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
    
    // Custom Events
    allYos: (data: any[]) => void; // Adjust the data type as per your needs
    liveYos: (data: any[]) => void;
    popYos: (data: any[]) => void;
}

// Get a single Yo from DB and redirect
export const getYo = async (req: Request, res: Response, next: NextFunction): Promise<Response<any>> => {
    const ip = req.headers['x-real-ip'] as string;
    const linkName = req.params.name.toLowerCase();

    try {
        const item = await Yo.findOneAndUpdate(
            { linkName },
            { $inc: { urlHits: 1 }, $set: { lastAccess: Date.now() } },
            { new: true } // Return the updated document
        );

        if (item) {
            logger.info(`User from ${ip} loaded ${item.originalUrl} as alias: ${linkName}`);
            return res.redirect(item.originalUrl) as unknown as Response<any>;
        }

        logger.warn(`Unable to find any entries for: ${linkName}`);
        return res.redirect(process.env.ERROR_URL!) as unknown as Response<any>;
    } catch (error) {
        logger.error(`There was an error while searching database for: ${linkName}: ${error}`);
        return res.redirect(process.env.ERROR_URL!) as unknown as Response<any>;
    }
};

// Add new Yo to DB
export const postYo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    const ip = req.headers['x-real-ip'] as string;
    const updatedAt = new Date();

    if (validUrl.isUri(originalUrl)) {
        try {
            const urlData = await Yo.findOne({ linkName: { $eq: linkName } });

            if (urlData) {
                logger.info(`User ${ip} could not create a Yo as the name is already in-use: ${linkName}`);
                return res.status(401).json('This name is already in-use. Please select another name.');
            } else {
                const shortUrl = `${shortBaseUrl}/${linkName}`;
                const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };

                const item = new Yo(itemToBeSaved);
                await item.save();
                logger.info(`User from ${ip} created alias: ${linkName} -> ${originalUrl}`);

                return res.status(200).json(itemToBeSaved);
            }
        } catch (error) {
            logger.error(`Error while trying to save Yo:${linkName} -> ${originalUrl} to database: ${error}`);
            const itemToBeSaved = { originalUrl, shortBaseUrl, linkName, updatedAt, status: 'Failed' };
            return res.status(500).json(itemToBeSaved);
        }
    } else {
        logger.warn(`The provided URL is improperly formatted: ${originalUrl}`);
        return res.status(400).json('The provided URL is improperly formatted.');
    }
};

// Update existing Yo in DB
export const updateYo = async (req: Request, res: Response, next: NextFunction): Promise<Response | null> => {
    const originalUrl = req.body.originalUrl;
    const linkName = req.params.name.toLowerCase();
    const ip = req.headers['x-real-ip'] as string;
    const updatedAt = new Date();

    if (validUrl.isUri(originalUrl)) {
        try {
            const item = await Yo.findOneAndUpdate<YoDocument>(
                { linkName },
                { $set: { originalUrl, updatedAt } },
                { new: true } // Return the updated document
            );

            if (item) {
                logger.info(`User from ${ip} updated ${originalUrl} as alias: ${linkName}`);
                const all = await Yo.find({}).sort({ linkName: 1 });
                return res.status(200).json(`${linkName} updated successfully.`);
            }

            logger.warn(`User from ${ip} tried updating alias: ${linkName}, but it doesn't exist.`);
            return res.status(500).json('There was an error while updating that Yo');
        } catch (error) {
            logger.warn(`There was an error while updating alias: ${linkName}: ${error}`);
            return res.status(500).json('There was an error while updating that Yo');
        }
    } else {
        logger.warn(`The provided URL is improperly formatted: ${originalUrl}`);
        return res.status(400).json('The provided URL is improperly formatted.');
    }
};

// Delete a Yo from DB
export const deleteYo = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const ip = req.headers['x-real-ip'] as string;
    const linkName = req.params.name.toLowerCase();

    try {
        // Using `.lean()` to return a plain object
        const item = await Yo.findOneAndDelete({ linkName }).lean(); 

        if (item) {
            logger.info(`User from ${ip} deleted ${item.originalUrl} as alias: ${linkName}`);
            const all = await Yo.find({}).sort({ linkName: 1 });
            return res.status(200).json(`${linkName} deleted successfully.`);
        }

        logger.warn(`Unable to delete alias: ${linkName}`);
        return res.status(500).json(`Failed to delete ${linkName}`);
    } catch (error) {
        logger.warn(`There was an error while deleting alias: ${linkName}: ${error}`);
        return res.status(500).json('There was an error while deleting that Yo');
    }
};

// Get Yo statistics
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    let hits = 0;

    try {
        const hitsData = await Yo.find({}, { urlHits: 1, _id: 0 }).sort({ urlHits: -1 });
        hitsData.forEach(data => {
            if (data.urlHits) {
                hits += data.urlHits;
            }
        });

        return res.status(200).json({
            totalYos: hitsData.length,
            totalHits: hits,
        });
    } catch (error) {
        logger.error(`Error retrieving Yo stats: ${error}`);
        return res.status(500).json('Error retrieving Yo stats');
    }
};

// Get recent Yos
export const getRecent = async (_req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
        const rec = await Yo.find({}).sort({ lastAccess: -1 }).limit(10);
        return res.status(200).json(rec);
    } catch (error) {
        logger.error(`Error retrieving recently used Yo's: ${error}`);
        return res.status(500).json('Error retrieving recently used Yo\'s');
    }
};

// Get popular Yos
export const getPopular = async (_req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
        const pop = await Yo.find({}).sort({ urlHits: -1 }).limit(10);
        if (pop) {
            return res.status(200).json(pop);
        }
        return res.status(500).json('Error retrieving popular Yo\'s');
    } catch (error) {
        logger.error(`Error retrieving popular Yo's: ${error}`);
        return res.status(500).json('Error retrieving popular Yo\'s');
    }
};

// Get latest Yos
export const getLatest = async (_req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
        const latest = await Yo.find({}).sort({ createdAt: -1 }).limit(10);
        if (latest) {
            return res.status(200).json(latest);
        }
        return res.status(500).json('Error retrieving the latest Yo\'s');
    } catch (error) {
        logger.error(`Error retrieving the latest Yo's: ${error}`);
        return res.status(500).json('Error retrieving the latest Yo\'s');
    }
};

// Get all Yos
export const getAll = async (_req: Request, res: Response, next: NextFunction): Promise<Response> => {
    try {
        const all = await Yo.find({}).sort({ linkName: 1 });
        if (all) {
            return res.status(200).json(all);
        }
        return res.status(500).json('Error retrieving all Yo\'s');
    } catch (error) {
        logger.error(`Error retrieving all Yo's: ${error}`);
        return res.status(500).json('Error retrieving all Yo\'s');
    }
};