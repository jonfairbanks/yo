import mongoose from 'mongoose'
import logger from './logger'

let isConnected = false

export const connectToDatabase = async () => {
    if (isConnected) {
        logger.info('Using the existing database connection')
        return mongoose.connection // Return the connection
    }

    try {
        // Check if there are any previous connections
        if (mongoose.connections.length > 0) {
            isConnected = mongoose.connections[0].readyState === 1

            if (isConnected) {
                logger.info('Using a previous database connection')
                return mongoose.connection // Return the previous connection
            } else if (mongoose.connections[0].readyState === 2) {
                logger.info(
                    'Database is in connecting state, reusing the connection'
                )
                return mongoose.connection // Return the connecting state
            }

            logger.info('Disconnecting from the database')
            await mongoose.disconnect()
        }

        // Establish a new connection
        const db = await mongoose.connect(process.env.MONGO_URI)

        isConnected = db.connections[0].readyState === 1
        logger.info('New database connection established')
        return db
    } catch (error) {
        logger.error('Error connecting to the database:', error)
        throw error
    }
}
