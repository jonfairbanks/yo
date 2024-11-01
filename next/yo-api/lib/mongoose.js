import mongoose from 'mongoose'

import logger from '../lib/logger'

let isConnected = false

export const connectToDatabase = async () => {
    if (isConnected) {
        logger.log('=> Using existing database connection')
        return
    }

    if (mongoose.connections.length > 0) {
        isConnected = mongoose.connections[0].readyState === 1

        if (isConnected) {
            logger.log('=> Using previous database connection')
            return
        }

        logger.log('=> Disconnecting from database')
        await mongoose.disconnect()
    }

    const db = await mongoose.connect(process.env.MONGO_URI)

    isConnected = db.connections[0].readyState === 1
    logger.log('=> New database connection established')
}
