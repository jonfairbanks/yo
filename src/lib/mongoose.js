import mongoose from 'mongoose'
import logger from './logger'
import { setSpanAttributes, withSpan } from './tracing'

const globalForMongoose = globalThis
const mongooseCache = globalForMongoose.__mongooseCache || {
    conn: null,
    promise: null,
}

globalForMongoose.__mongooseCache = mongooseCache

export const connectToDatabase = async () =>
    withSpan(
        'mongo connect',
        {
            'db.system': 'mongodb',
            'db.operation': 'connect',
        },
        async (span) => {
            if (mongooseCache.conn) {
                span.setAttribute('db.connection.state', 'cached')
                return mongooseCache.conn
            }

            try {
                if (!mongooseCache.promise) {
                    span.setAttribute('db.connection.state', 'new')
                    mongooseCache.promise = mongoose.connect(
                        process.env.MONGO_URI,
                        {
                            bufferCommands: false,
                            maxPoolSize: 10,
                        }
                    )
                } else {
                    span.setAttribute('db.connection.state', 'pending')
                    logger.info(
                        'Database connection is already in progress, reusing the promise'
                    )
                }

                mongooseCache.conn = await mongooseCache.promise
                setSpanAttributes({
                    'db.connection.ready': true,
                })
                logger.info('New database connection established')
                return mongooseCache.conn
            } catch (error) {
                mongooseCache.promise = null
                mongooseCache.conn = null
                setSpanAttributes({
                    'db.connection.state': 'error',
                })
                logger.error('Error connecting to the database:', error)
                throw error
            }
        }
    )
