import { createMocks } from 'node-mocks-http'

import handler from '../../../pages/api/stats'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'

jest.mock('../../../lib/mongoose', () => ({
    connectToDatabase: jest.fn(),
}))

jest.mock('../../../models/yo', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
    },
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
        connectToDatabase.mockResolvedValue()
        jest.spyOn(Date, 'now').mockReturnValue(
            new Date('2026-03-15T12:00:00.000Z').getTime()
        )
    })

    afterEach(() => {
        Date.now.mockRestore()
    })

    it('returns aggregate stats for the current link catalog', async () => {
        Yo.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                {
                    createdAt: '2026-03-10T10:00:00.000Z',
                    lastAccess: '2026-03-14T09:00:00.000Z',
                    linkName: 'alpha',
                    urlHits: 10,
                },
                {
                    createdAt: '2026-01-10T10:00:00.000Z',
                    lastAccess: null,
                    linkName: 'beta',
                    urlHits: 0,
                },
                {
                    createdAt: '2026-03-12T10:00:00.000Z',
                    lastAccess: '2026-03-15T08:00:00.000Z',
                    linkName: 'gamma',
                    urlHits: 5,
                },
            ]),
        })

        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(connectToDatabase).toHaveBeenCalled()
        expect(Yo.find).toHaveBeenCalledWith(
            {},
            {
                createdAt: 1,
                lastAccess: 1,
                linkName: 1,
                urlHits: 1,
                _id: 0,
            }
        )
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
        Yo.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
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
