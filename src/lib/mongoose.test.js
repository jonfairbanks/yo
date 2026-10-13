import mongoose from 'mongoose'

import logger from './logger'
import { connectToDatabase } from './mongoose'
import { setSpanAttributes, withSpan } from './tracing'

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
        expect(withSpan).not.toHaveBeenCalled()
    })
    it('replaces database error details before logging or rethrowing', async () => {
        mongoose.connect.mockRejectedValue(
            new Error('test-private-connection-marker')
        )
        await expect(connectToDatabase()).rejects.toThrow(
            'Database connection failed'
        )
        expect(logger.error).toHaveBeenCalledWith({
            event: 'database_connection_failed',
            category: 'unknown',
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
            'test-private-connection-marker'
        )
        expect(global.__mongooseCache.promise).toBeNull()
    })

    it('traces cold and pending connections while sharing one driver attempt', async () => {
        const spans = []
        withSpan.mockImplementation(async (_name, _attributes, callback) => {
            const span = { setAttribute: jest.fn() }
            spans.push(span)
            return callback(span)
        })
        let resolveConnection
        const connection = { readyState: 1 }
        mongoose.connect.mockReturnValue(
            new Promise((resolve) => {
                resolveConnection = resolve
            })
        )
        const cold = connectToDatabase()
        const pending = connectToDatabase()
        expect(mongoose.connect).toHaveBeenCalledTimes(1)
        expect(withSpan).toHaveBeenCalledTimes(2)
        resolveConnection(connection)
        await expect(cold).resolves.toBe(connection)
        await expect(pending).resolves.toBe(connection)
        expect(spans[0].setAttribute).toHaveBeenCalledWith(
            'db.connection.state',
            'new'
        )
        expect(spans[1].setAttribute).toHaveBeenCalledWith(
            'db.connection.state',
            'pending'
        )
        expect(setSpanAttributes).toHaveBeenCalledWith({
            'db.connection.ready': true,
        })
        await connectToDatabase()
        expect(withSpan).toHaveBeenCalledTimes(2)
    })

    it('preserves only the category through sanitized rethrows and allows retry', async () => {
        const secret = 'mongodb://user:private-password@private-host'
        mongoose.connect.mockRejectedValueOnce(
            Object.assign(new Error(secret), {
                cause: Object.assign(new Error(secret), { code: 'ENOTFOUND' }),
            })
        )
        const error = await connectToDatabase().catch((failure) => failure)
        expect(error.message).toBe('Database connection failed')
        expect(error.telemetryCategory).toBe('dns')
        expect(error.cause).toBeUndefined()
        expect(error.stack).not.toContain(secret)
        expect(JSON.stringify(error)).not.toContain(secret)
        expect(logger.error).toHaveBeenCalledWith({
            event: 'database_connection_failed',
            category: 'dns',
        })
        expect(global.__mongooseCache.promise).toBeNull()
        expect(global.__mongooseCache.conn).toBeNull()
        mongoose.connect.mockResolvedValueOnce({ readyState: 1 })
        await expect(connectToDatabase()).resolves.toEqual({ readyState: 1 })
        expect(mongoose.connect).toHaveBeenCalledTimes(2)
    })
})
