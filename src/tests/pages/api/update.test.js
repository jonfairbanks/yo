import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/update'
import { updateAlias } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    updateAlias: jest.fn(),
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
        updateAlias.mockResolvedValue({
            message: 'docs updated successfully.',
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
        expect(updateAlias).not.toHaveBeenCalled()
    })

    it('blocks reserved aliases', async () => {
        updateAlias.mockRejectedValue({
            code: 'reserved_alias',
            message: 'This link name is reserved by the application.',
            statusCode: 400,
        })
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
        expect(updateAlias).toHaveBeenCalledTimes(1)
    })

    it('rejects invalid destination URLs', async () => {
        updateAlias.mockRejectedValue({
            code: 'invalid_url',
            message: 'The provided URL is improperly formatted.',
            statusCode: 400,
        })
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'docs',
                originalUrl: 'not-a-url',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'The provided URL is improperly formatted.',
        })
        expect(updateAlias).toHaveBeenCalledTimes(1)
    })

    it('updates an existing alias with a canonical link name', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: ' /Docs/ ',
                originalUrl: 'https://example.com/updated',
            },
        })

        await handler(req, res)

        expect(updateAlias).toHaveBeenCalledWith({
            linkName: ' /Docs/ ',
            originalUrl: 'https://example.com/updated',
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            message: 'docs updated successfully.',
        })
    })

    it('returns not found when the alias does not exist', async () => {
        updateAlias.mockRejectedValue({
            code: 'missing',
            message: 'Alias missing not found.',
            statusCode: 404,
        })
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'missing',
                originalUrl: 'https://example.com/missing',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(404)
        expect(res._getJSONData()).toEqual({
            error: 'Alias missing not found.',
        })
    })
})
