import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'
import handler from '../../../pages/api/create'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../lib/mongoose', () => ({
    connectToDatabase: jest.fn(),
}))

jest.mock('../../../models/yo', () => {
    const saveMock = jest.fn()
    const YoModel = jest.fn(function YoModel(data) {
        Object.assign(this, data)
        this.save = saveMock
    })

    YoModel.findOne = jest.fn()
    YoModel.__saveMock = saveMock

    return {
        __esModule: true,
        default: YoModel,
    }
})

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

describe('create API handler', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        process.env.SHORT_BASE_URL = 'https://yo.test'

        auth0.getSession.mockResolvedValue({
            user: { sub: 'user-1' },
        })
        connectToDatabase.mockResolvedValue({})
        Yo.findOne.mockResolvedValue(null)
        Yo.__saveMock.mockResolvedValue(undefined)
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
                linkName: 'api',
                originalUrl: 'https://example.com/docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'This link name is reserved by the application.',
        })
        expect(Yo.findOne).not.toHaveBeenCalled()
        expect(Yo.__saveMock).not.toHaveBeenCalled()
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
        expect(res._getJSONData()).toEqual({
            error: 'The provided URL is improperly formatted.',
        })
        expect(Yo.findOne).not.toHaveBeenCalled()
    })

    it('rejects blank aliases after normalization', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: '   ',
                originalUrl: 'https://example.com/docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'A link name is required.',
        })
        expect(Yo.findOne).not.toHaveBeenCalled()
        expect(Yo.__saveMock).not.toHaveBeenCalled()
    })

    it('rejects duplicate aliases', async () => {
        Yo.findOne.mockResolvedValue({ linkName: 'docs' })
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)
        expect(res._getJSONData()).toEqual({
            error: 'This name is already in-use. Please select another name.',
        })
        expect(Yo.__saveMock).not.toHaveBeenCalled()
    })

    it('creates a new alias with a canonical link name', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                linkName: ' /Docs/ ',
                originalUrl: 'https://example.com/docs',
                updatedAt: '2026-03-15T12:00:00.000Z',
            },
        })

        await handler(req, res)

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.findOne).toHaveBeenCalledWith({
            linkName: { $eq: 'docs' },
        })
        expect(Yo).toHaveBeenCalledWith({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
            shortUrl: 'https://yo.test/docs',
        })
        expect(Yo.__saveMock).toHaveBeenCalledTimes(1)
        expect(res._getStatusCode()).toBe(201)
        expect(res._getJSONData()).toEqual({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
            shortUrl: 'https://yo.test/docs',
        })
    })
})
