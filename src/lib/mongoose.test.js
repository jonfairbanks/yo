import mongoose from 'mongoose'

import logger from './logger'
import { connectToDatabase } from './mongoose'

jest.mock('mongoose', () => ({
    __esModule: true,
    default: {
        connect: jest.fn(),
    },
}))

jest.mock('./logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock('./tracing', () => ({
    setSpanAttributes: jest.fn(),
    withSpan: jest.fn(async (_name, _attributes, callback) =>
        callback({
            setAttribute: jest.fn(),
        })
    ),
}))

describe('connectToDatabase', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        global.__mongooseCache.conn = null
        global.__mongooseCache.promise = null
    })

    it('reuses a cached connection without logging an info message', async () => {
        const cachedConnection = { readyState: 1 }
        global.__mongooseCache.conn = cachedConnection

        const result = await connectToDatabase()

        expect(result).toBe(cachedConnection)
        expect(mongoose.connect).not.toHaveBeenCalled()
        expect(logger.info).not.toHaveBeenCalled()
    })
})
