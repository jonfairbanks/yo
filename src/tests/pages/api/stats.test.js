import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/stats'
import { getStats } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    getStats: jest.fn(),
}))

jest.mock('../../../lib/tracing', () => ({
    withSpan: jest.fn(async (_name, _attributes, callback) =>
        callback({
            setAttribute: jest.fn(),
        })
    ),
}))

describe('/api/stats', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        jest.spyOn(Date, 'now').mockReturnValue(
            new Date('2026-03-15T12:00:00.000Z').getTime()
        )
        getStats.mockResolvedValue({
            activeYos: 2,
            averageHitsPerYo: 5,
            latestAccessedYo: {
                lastAccess: '2026-03-15T08:00:00.000Z',
                linkName: 'gamma',
            },
            newestYo: {
                createdAt: '2026-03-12T10:00:00.000Z',
                linkName: 'gamma',
            },
            popularYo: {
                linkName: 'alpha',
                urlHits: 10,
            },
            recentlyAccessedYos: 2,
            recentlyCreatedYos: 2,
            recentWindowDays: 30,
            totalHits: 15,
            totalYos: 3,
            unusedYos: 1,
        })
    })

    afterEach(() => {
        Date.now.mockRestore()
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
        expect(getStats).not.toHaveBeenCalled()
    })

    it('returns aggregate stats for the current link catalog', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(getStats).toHaveBeenCalledWith({
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            activeYos: 2,
            averageHitsPerYo: 5,
            latestAccessedYo: {
                lastAccess: '2026-03-15T08:00:00.000Z',
                linkName: 'gamma',
            },
            newestYo: {
                createdAt: '2026-03-12T10:00:00.000Z',
                linkName: 'gamma',
            },
            popularYo: {
                linkName: 'alpha',
                urlHits: 10,
            },
            recentlyAccessedYos: 2,
            recentlyCreatedYos: 2,
            recentWindowDays: 30,
            totalHits: 15,
            totalYos: 3,
            unusedYos: 1,
        })
    })

    it('returns an empty-state payload when no links exist', async () => {
        getStats.mockResolvedValue({
            activeYos: 0,
            averageHitsPerYo: 0,
            latestAccessedYo: null,
            newestYo: null,
            popularYo: null,
            recentlyAccessedYos: 0,
            recentlyCreatedYos: 0,
            recentWindowDays: 30,
            totalHits: 0,
            totalYos: 0,
            unusedYos: 0,
        })

        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            activeYos: 0,
            averageHitsPerYo: 0,
            latestAccessedYo: null,
            newestYo: null,
            popularYo: null,
            recentlyAccessedYos: 0,
            recentlyCreatedYos: 0,
            recentWindowDays: 30,
            totalHits: 0,
            totalYos: 0,
            unusedYos: 0,
        })
    })
})
