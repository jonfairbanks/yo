import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'
import handler from '../../../pages/api/delete'

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
        findOneAndDelete: jest.fn(),
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

describe('delete API handler', () => {
    let leanMock

    beforeEach(() => {
        jest.clearAllMocks()
        leanMock = jest.fn().mockResolvedValue({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
        })

        auth0.getSession.mockResolvedValue({
            user: { nickname: 'tester' },
        })
        connectToDatabase.mockResolvedValue({})
        Yo.findOneAndDelete.mockReturnValue({
            lean: leanMock,
        })
    })

    it('rejects non-DELETE requests', async () => {
        const { req, res } = createMocks({
            method: 'POST',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(res._getJSONData()).toEqual({
            error: 'Method not allowed. Use DELETE.',
        })
        expect(auth0.getSession).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated requests', async () => {
        auth0.getSession.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
        expect(connectToDatabase).not.toHaveBeenCalled()
    })

    it('requires a link name', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {},
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'No link name provided.',
        })
        expect(Yo.findOneAndDelete).not.toHaveBeenCalled()
    })

    it('deletes an existing alias', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.findOneAndDelete).toHaveBeenCalledWith({
            linkName: 'docs',
        })
        expect(leanMock).toHaveBeenCalledTimes(1)
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            message: 'docs deleted successfully.',
        })
    })

    it('returns not found when the alias does not exist', async () => {
        leanMock.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'missing',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(404)
        expect(res._getJSONData()).toEqual({
            error: 'Alias missing not found.',
        })
    })

    it('returns a server error when deletion fails', async () => {
        leanMock.mockRejectedValue(new Error('db down'))
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(res._getJSONData()).toEqual({
            error: 'Failed to delete docs.',
        })
    })
})
