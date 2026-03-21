import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/popular'
import { getPopularAliases } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    getPopularAliases: jest.fn(),
}))

jest.mock('../../../lib/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
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

describe('/api/popular', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        getPopularAliases.mockResolvedValue([
            {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
                urlHits: 0,
            },
        ])

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
    })

    it('rejects non-GET requests', async () => {
        const { req, res } = createMocks({
            method: 'POST',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(res._getJSONData()).toEqual({ error: 'Method not allowed' })
        expect(auth0.getSession).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated requests', async () => {
        auth0.getSession.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
        expect(getPopularAliases).not.toHaveBeenCalled()
    })

    it('returns the most popular links', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(getPopularAliases).toHaveBeenCalledWith({
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual([
            {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
                urlHits: 0,
            },
        ])
    })
})
