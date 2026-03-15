import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'
import handler from '../../../pages/api'

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
        countDocuments: jest.fn(),
        find: jest.fn(),
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

describe('/api', () => {
    let leanMock
    let limitMock
    let skipMock
    let sortMock

    beforeEach(() => {
        jest.clearAllMocks()

        leanMock = jest.fn().mockResolvedValue([
            {
                linkName: 'alpha',
                originalUrl: 'https://example.com/a',
                urlHits: 12,
            },
        ])
        limitMock = jest.fn(() => ({
            lean: leanMock,
        }))
        skipMock = jest.fn(() => ({
            limit: limitMock,
        }))
        sortMock = jest.fn(() => ({
            skip: skipMock,
        }))

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        connectToDatabase.mockResolvedValue({})
        Yo.countDocuments.mockResolvedValue(42)
        Yo.find.mockReturnValue({
            sort: sortMock,
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
        expect(connectToDatabase).not.toHaveBeenCalled()
    })

    it('returns paginated aliases with defaults', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: {},
        })

        await handler(req, res)

        expect(Yo.find).toHaveBeenCalledWith(
            {},
            {
                linkName: 1,
                originalUrl: 1,
                urlHits: 1,
                _id: 0,
            }
        )
        expect(sortMock).toHaveBeenCalledWith({ linkName: 1 })
        expect(skipMock).toHaveBeenCalledWith(0)
        expect(limitMock).toHaveBeenCalledWith(10)
        expect(Yo.countDocuments).toHaveBeenCalledWith({})
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
        leanMock.mockResolvedValue([
            {
                linkName: 'legacy',
                originalUrl: 'https://example.com/legacy',
            },
        ])

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

        expect(Yo.find).toHaveBeenCalledWith(
            {
                $or: [
                    {
                        linkName: {
                            $regex: 'docs',
                            $options: 'i',
                        },
                    },
                    {
                        originalUrl: {
                            $regex: 'docs',
                            $options: 'i',
                        },
                    },
                ],
            },
            {
                linkName: 1,
                originalUrl: 1,
                urlHits: 1,
                _id: 0,
            }
        )
        expect(sortMock).toHaveBeenCalledWith({ urlHits: -1 })
        expect(skipMock).toHaveBeenCalledWith(20)
        expect(limitMock).toHaveBeenCalledWith(20)
        expect(Yo.countDocuments).toHaveBeenCalledWith({
            $or: [
                {
                    linkName: {
                        $regex: 'docs',
                        $options: 'i',
                    },
                },
                {
                    originalUrl: {
                        $regex: 'docs',
                        $options: 'i',
                    },
                },
            ],
        })
        expect(res._getStatusCode()).toBe(200)
    })
})
