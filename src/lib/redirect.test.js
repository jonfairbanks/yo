import { connectToDatabase } from './mongoose'
import Yo from '../models/yo'
import { resolveRedirect } from './redirect'

jest.mock('./mongoose', () => ({
    connectToDatabase: jest.fn(),
}))

jest.mock('../models/yo', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
        updateOne: jest.fn(),
    },
}))

jest.mock('./logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock('./tracing', () => ({
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

describe('resolveRedirect', () => {
    const buildReq = (overrides = {}) => ({
        headers: {
            host: 'yo.test',
            'x-forwarded-proto': 'https',
            ...(overrides.headers || {}),
        },
        socket: overrides.socket || {},
    })

    beforeEach(() => {
        jest.clearAllMocks()
        connectToDatabase.mockResolvedValue({})
        Yo.updateOne.mockResolvedValue({ acknowledged: true, matchedCount: 1 })
    })

    it('returns 404 when the alias does not exist', async () => {
        Yo.findOne.mockResolvedValue(null)

        await expect(
            resolveRedirect({
                redirectParam: 'missing',
                req: buildReq(),
            })
        ).resolves.toEqual({
            error: 'Unable to find any entries for: missing',
            status: 404,
        })
    })

    it('returns an absolute external target URL', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://example.com/docs',
        })

        await expect(
            resolveRedirect({
                redirectParam: 'docs',
                req: buildReq(),
            })
        ).resolves.toEqual({
            status: 302,
            targetUrl: 'https://example.com/docs',
        })

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.findOne).toHaveBeenCalledWith(
            { linkName: 'docs' },
            { originalUrl: 1 }
        )
        expect(Yo.updateOne).toHaveBeenCalledWith(
            { _id: 'alias-id' },
            {
                $inc: { urlHits: 1 },
                $set: { lastAccess: expect.any(Number) },
            }
        )
    })

    it('normalizes the incoming alias before lookup', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://example.com/docs',
        })

        await expect(
            resolveRedirect({
                redirectParam: ' /Docs/ ',
                req: buildReq(),
            })
        ).resolves.toEqual({
            status: 302,
            targetUrl: 'https://example.com/docs',
        })

        expect(Yo.findOne).toHaveBeenCalledWith(
            { linkName: 'docs' },
            { originalUrl: 1 }
        )
    })

    it('builds an absolute URL for relative destinations', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: '/team/docs',
        })

        await expect(
            resolveRedirect({
                redirectParam: 'docs',
                req: buildReq(),
            })
        ).resolves.toEqual({
            status: 302,
            targetUrl: 'https://yo.test/team/docs',
        })
    })

    it('blocks self-referential short links', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: '/hello',
        })

        await expect(
            resolveRedirect({
                redirectParam: 'hello',
                req: buildReq(),
            })
        ).resolves.toEqual({
            error: 'Destination points back to this short link.',
            log: 'Prevented self-referential redirect for alias hello -> https://yo.test/hello',
            status: 400,
        })

        expect(Yo.updateOne).not.toHaveBeenCalled()
    })

    it('blocks redirects back to the redirect handler', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://example.com/api/redirect/hello',
        })

        await expect(
            resolveRedirect({
                redirectParam: 'hello',
                req: buildReq(),
            })
        ).resolves.toEqual({
            error: 'Destination points back to the redirect handler.',
            log: 'Prevented redirect loop for alias hello -> https://example.com/api/redirect/hello',
            status: 400,
        })

        expect(Yo.updateOne).not.toHaveBeenCalled()
    })
})
