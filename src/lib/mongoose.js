import mongoose from 'mongoose'
import logger from './logger'
import { setSpanAttributes, withSpan } from './tracing'

let isConnected = false

export const connectToDatabase = async () =>
    withSpan(
        'mongo.connect',
        {
            'db.system': 'mongodb',
            'db.operation': 'connect',
        },
        async (span) => {
            if (isConnected) {
                span.setAttribute('db.connection.state', 'cached')
                logger.info('Using the existing database connection')
                return mongoose.connection
            }

            try {
                if (mongoose.connections.length > 0) {
                    isConnected = mongoose.connections[0].readyState === 1

                    if (isConnected) {
                        span.setAttribute('db.connection.state', 'reused')
                        logger.info('Using a previous database connection')
                        return mongoose.connection
                    } else if (mongoose.connections[0].readyState === 2) {
                        span.setAttribute('db.connection.state', 'connecting')
                        logger.info(
                            'Database is in connecting state, reusing the connection'
                        )
                        return mongoose.connection
                    }

                    logger.info('Disconnecting from the database')
                    await mongoose.disconnect()
                }

                const db = await mongoose.connect(process.env.MONGO_URI)

                isConnected = db.connections[0].readyState === 1
                setSpanAttributes({
                    'db.connection.state': 'new',
                    'db.connection.ready': isConnected,
                })
                logger.info('New database connection established')
                return db
            } catch (error) {
                setSpanAttributes({
                    'db.connection.state': 'error',
                })
                logger.error('Error connecting to the database:', error)
                throw error
            }
        }
    )
