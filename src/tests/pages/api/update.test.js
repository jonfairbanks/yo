import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'
import handler from '../../../pages/api/update'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../lib/mongoose', () => ({
    connectToDatabase: jest.fn(),
}))

jest.mock('../../../models/yo', () => ({
    __esModule: true,
    default: {
        findOneAndUpdate: jest.fn(),
    },
}))

jest.mock('../../../lib/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock('../../../lib/tracing', () => ({
    withSpan: jest.fn(async (_name, attributesOrCallback, maybeCallback) => {
        const callback =
            typeof attributesOrCallback === 'function'
                ? attributesOrCallback
                : maybeCallback

        return callback({
            setAttribute: jest.fn(),
        })
    }),
}))

describe('update API handler', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        connectToDatabase.mockResolvedValue({})
        Yo.findOneAndUpdate.mockResolvedValue({
            linkName: 'docs',
        })
    })

    it('rejects non-POST requests', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(res._getJSONData()).toEqual({ error: 'Method not allowed' })
        expect(auth0.getSession).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated requests', async () => {
        auth0.getSession.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
        expect(connectToDatabase).not.toHaveBeenCalled()
    })

    it('blocks reserved aliases', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: '_next/assets',
                originalUrl: 'https://example.com/docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'This link name is reserved by the application.',
        })
        expect(Yo.findOneAndUpdate).not.toHaveBeenCalled()
    })

    it('rejects invalid destination URLs', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'docs',
                originalUrl: 'not-a-url',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toBe(
            'The provided URL is improperly formatted.'
        )
        expect(Yo.findOneAndUpdate).not.toHaveBeenCalled()
    })

    it('updates an existing alias', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'docs',
                originalUrl: 'https://example.com/updated',
            },
        })

        await handler(req, res)

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.findOneAndUpdate).toHaveBeenCalledWith(
            { linkName: 'docs' },
            {
                $set: {
                    originalUrl: 'https://example.com/updated',
                    updatedAt: expect.any(Date),
                },
            },
            { new: true }
        )
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toBe('docs updated successfully.')
    })

    it('returns a server error when the alias does not exist', async () => {
        Yo.findOneAndUpdate.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'missing',
                originalUrl: 'https://example.com/missing',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(res._getJSONData()).toBe(
            'There was an error while trying to update that Yo'
        )
    })
})
