import mongoose from 'mongoose'

import logger from './logger'

let isConnected = false

export const connectToDatabase = async () => {
    if (isConnected) {
        logger.info('Using the existing database connection')
        return
    }

    if (mongoose.connections.length > 0) {
        isConnected = mongoose.connections[0].readyState === 1

        if (isConnected) {
            logger.info('Using a previous database connection')
            return
        }

        logger.info('Disconnecting from the database')
        await mongoose.disconnect()
    }

    const db = await mongoose.connect(process.env.MONGO_URI)

    isConnected = db.connections[0].readyState === 1
    logger.info('New database connection established')
}
