import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api'
import { listAliases } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    listAliases: jest.fn(),
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

describe('/api', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        listAliases.mockResolvedValue({
            items: [
                {
                    linkName: 'alpha',
                    originalUrl: 'https://example.com/a',
                    urlHits: 12,
                },
            ],
            pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 42,
                totalPages: 5,
            },
        })
    })

    it('rejects unauthenticated requests', async () => {
        auth0.getSession.mockResolvedValue(null)

        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
        expect(listAliases).not.toHaveBeenCalled()
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

    it('returns paginated aliases with defaults', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: {},
        })

        await handler(req, res)

        expect(listAliases).toHaveBeenCalledWith({
            query: {},
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            items: [
                {
                    linkName: 'alpha',
                    originalUrl: 'https://example.com/a',
                    urlHits: 12,
                },
            ],
            pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 42,
                totalPages: 5,
            },
        })
    })

    it('normalizes missing hit counters to zero', async () => {
        listAliases.mockResolvedValue({
            items: [
                {
                    linkName: 'legacy',
                    originalUrl: 'https://example.com/legacy',
                    urlHits: 0,
                },
            ],
            pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 1,
                totalPages: 1,
            },
        })

        const { req, res } = createMocks({
            method: 'GET',
            query: {},
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData().items).toEqual([
            {
                linkName: 'legacy',
                originalUrl: 'https://example.com/legacy',
                urlHits: 0,
            },
        ])
    })

    it('applies filtering, pagination, and descending sorting', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: {
                page: '2',
                pageSize: '20',
                q: 'docs',
                sortBy: 'urlHits',
                sortDir: 'desc',
            },
        })

        await handler(req, res)

        expect(listAliases).toHaveBeenCalledWith({
            query: {
                page: '2',
                pageSize: '20',
                q: 'docs',
                sortBy: 'urlHits',
                sortDir: 'desc',
            },
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
    })
})
