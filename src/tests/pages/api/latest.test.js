import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/latest'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'

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
        find: jest.fn(),
    },
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

describe('/api/latest', () => {
    let leanMock
    let limitMock
    let sortMock

    beforeEach(() => {
        jest.clearAllMocks()

        leanMock = jest.fn().mockResolvedValue([
            {
                lastAccess: '2026-03-15T08:00:00.000Z',
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            },
        ])
        limitMock = jest.fn(() => ({
            lean: leanMock,
        }))
        sortMock = jest.fn(() => ({
            limit: limitMock,
        }))

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        connectToDatabase.mockResolvedValue({})
        Yo.find.mockReturnValue({
            sort: sortMock,
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
        expect(connectToDatabase).not.toHaveBeenCalled()
    })

    it('returns the latest links', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        })

        await handler(req, res)

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.find).toHaveBeenCalledWith(
            {},
            {
                linkName: 1,
                originalUrl: 1,
                lastAccess: 1,
                _id: 0,
            }
        )
        expect(sortMock).toHaveBeenCalledWith({ lastAccess: -1 })
        expect(limitMock).toHaveBeenCalledWith(10)
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual([
            {
                lastAccess: '2026-03-15T08:00:00.000Z',
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            },
        ])
    })
})
