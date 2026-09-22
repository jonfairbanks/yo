import { connectToDatabase } from './mongoose'
import Yo from '../models/yo'
import logger from './logger'
import { withSpan } from './tracing'
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
        socket: overrides.socket || { remoteAddress: '192.0.2.1' },
    })

    beforeEach(() => {
        jest.clearAllMocks()
        delete global.__yoIpRedirectBudget
        process.env.SHORT_BASE_URL = 'https://yo.test'
        connectToDatabase.mockResolvedValue({})
        Yo.updateOne.mockResolvedValue({ acknowledged: true, matchedCount: 1 })
    })

    it.each([
        'https://example.com/API/REDIRECT/guide',
        'https://example.com/api/redirect/guide',
        'https://example.com/files/%FF',
        'https://example.com/docs?next=/api/redirect/guide',
    ])(
        'preserves external destinations and hit counts: %s',
        async (originalUrl) => {
            Yo.findOne.mockResolvedValue({ _id: 'alias-id', originalUrl })
            const result = await resolveRedirect({
                redirectParam: 'docs',
                req: buildReq(),
            })
            expect(result).toEqual({ status: 302, targetUrl: originalUrl })
            expect(Yo.updateOne).toHaveBeenCalledTimes(1)
        }
    )

    it('keeps another IP working after one IP exhausts its rate', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://example.com/docs',
        })
        const { createRedirectBudget } = await import('./request-budget')
        global.__yoIpRedirectBudget = createRedirectBudget({ now: () => 0 })
        for (let i = 0; i < 20; i += 1) {
            expect(
                (
                    await resolveRedirect({
                        redirectParam: 'docs',
                        req: buildReq(),
                    })
                ).status
            ).toBe(302)
        }
        expect(
            (await resolveRedirect({ redirectParam: 'docs', req: buildReq() }))
                .status
        ).toBe(429)
        expect(
            (
                await resolveRedirect({
                    redirectParam: 'docs',
                    req: buildReq({ socket: { remoteAddress: '192.0.2.2' } }),
                })
            ).status
        ).toBe(302)
        expect(Yo.updateOne).toHaveBeenCalledTimes(21)
    })

    it('separates App Runner clients sharing the same socket peer', async () => {
        const { createRedirectBudget } = await import('./request-budget')
        global.__yoIpRedirectBudget = createRedirectBudget({ now: () => 0 })
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://example.com/docs',
        })
        const req = (header) =>
            buildReq({
                socket: { remoteAddress: '10.0.0.1' },
                headers: { 'x-forwarded-for': header },
            })
        for (let i = 0; i < 20; i += 1) {
            expect(
                (
                    await resolveRedirect({
                        redirectParam: 'docs',
                        req: req('192.0.2.1'),
                    })
                ).status
            ).toBe(302)
        }
        expect(
            (
                await resolveRedirect({
                    redirectParam: 'docs',
                    req: req('198.51.100.1, 192.0.2.1'),
                })
            ).status
        ).toBe(429)
        expect(
            (
                await resolveRedirect({
                    redirectParam: 'docs',
                    req: req('192.0.2.2'),
                })
            ).status
        ).toBe(302)
        expect(Yo.updateOne).toHaveBeenCalledTimes(21)
    })

    it.each(['', 'invalid', ['192.0.2.1'], '192.0.2.1,', 'x'.repeat(4097)])(
        'rejects a malformed forwarded client address: %p',
        async (forwarded) => {
            const result = await resolveRedirect({
                redirectParam: 'docs',
                req: buildReq({ headers: { 'x-forwarded-for': forwarded } }),
            })
            expect(result.status).toBe(400)
            expect(connectToDatabase).not.toHaveBeenCalled()
            expect(Yo.updateOne).not.toHaveBeenCalled()
        }
    )

    it.each([
        ['2001:0DB8:0:0:0:0:0:1', '2001:db8::1'],
        ['::ffff:192.0.2.1', '192.0.2.1'],
        ['::ffff:c000:201', '192.0.2.1'],
    ])(
        'shares a budget across equivalent IP forms: %s',
        async (forwarded, socketIp) => {
            const { createRedirectBudget } = await import('./request-budget')
            global.__yoIpRedirectBudget = createRedirectBudget({
                now: () => 0,
            })
            Yo.findOne.mockResolvedValue({
                _id: 'alias-id',
                originalUrl: 'https://example.com/docs',
            })
            for (let i = 0; i < 19; i += 1) {
                global.__yoIpRedirectBudget.acquire(socketIp)()
            }
            const first = await resolveRedirect({
                redirectParam: 'docs',
                req: buildReq({ headers: { 'x-forwarded-for': forwarded } }),
            })
            const second = await resolveRedirect({
                redirectParam: 'docs',
                req: buildReq({ socket: { remoteAddress: socketIp } }),
            })
            expect(first.status).toBe(302)
            expect(second.status).toBe(429)
            expect(Yo.updateOne).toHaveBeenCalledTimes(1)
        }
    )

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
            status: 400,
        })

        expect(Yo.updateOne).not.toHaveBeenCalled()
    })

    it('blocks redirects back to the redirect handler', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://yo.test/api/redirect/other',
        })

        await expect(
            resolveRedirect({
                redirectParam: 'hello',
                req: buildReq(),
            })
        ).resolves.toEqual({
            error: 'Destination points back to the redirect handler.',
            status: 400,
        })

        expect(Yo.updateOne).not.toHaveBeenCalled()
    })
    it('keeps destination data out of redirect logs and span attributes', async () => {
        const destination =
            'https://example.com/private-reference?token=test-marker#section'
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: destination,
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq(),
        })
        expect(result.targetUrl).toBe(destination)
        expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
            'test-marker'
        )
        expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
            'test-marker'
        )
        expect(logger.info).toHaveBeenCalledWith({
            event: 'redirect_success',
            alias: 'docs',
            status: 302,
        })
        expect(
            withSpan.mock.calls.every(
                ([, attributes]) => !Object.hasOwn(attributes, 'yo.alias')
            )
        ).toBe(true)
    })

    it('uses the configured origin regardless of proxy headers', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: '/team/docs',
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq({
                headers: { host: 'proxy.test', 'x-forwarded-proto': 'http' },
            }),
        })
        expect(result.targetUrl).toBe('https://yo.test/team/docs')
    })

    it('rejects relative destinations without a configured origin', async () => {
        delete process.env.SHORT_BASE_URL
        delete process.env.APP_BASE_URL
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: '/team/docs',
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq(),
        })
        expect(result.status).toBe(400)
        expect(Yo.updateOne).not.toHaveBeenCalled()
    })

    it('rejects relative destinations that resolve outside the configured origin', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: '//example.com/docs',
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq(),
        })
        expect(result.status).toBe(400)
        expect(Yo.updateOne).not.toHaveBeenCalled()
    })

    it('returns 429 before database or span work when its budget is exhausted', async () => {
        global.__yoIpRedirectBudget = { acquire: () => null }
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq(),
        })
        expect(result).toEqual({
            status: 429,
            error: 'Too many requests. Try again shortly.',
            retryAfter: 1,
        })
        expect(connectToDatabase).not.toHaveBeenCalled()
        expect(withSpan).not.toHaveBeenCalled()
    })

    it('releases capacity after database failures', async () => {
        const release = jest.fn()
        global.__yoIpRedirectBudget = { acquire: () => release }
        connectToDatabase.mockRejectedValue(
            new Error('Database connection failed')
        )
        await expect(
            resolveRedirect({ redirectParam: 'docs', req: buildReq() })
        ).rejects.toThrow('Database connection failed')
        expect(release).toHaveBeenCalledTimes(1)
    })
    it.each(['/Docs', '/%64ocs', '/%2Fdocs'])(
        'blocks equivalent self paths: %s',
        async (path) => {
            Yo.findOne.mockResolvedValue({
                _id: 'alias-id',
                originalUrl: `https://yo.test${path}`,
            })
            const result = await resolveRedirect({
                redirectParam: 'docs',
                req: buildReq(),
            })
            expect(result.status).toBe(400)
            expect(Yo.updateOne).not.toHaveBeenCalled()
        }
    )

    it('keeps loop checks for an alternate request host', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://alternate.test/docs',
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq({ headers: { host: 'alternate.test' } }),
        })
        expect(result.status).toBe(400)
        expect(Yo.updateOne).not.toHaveBeenCalled()
    })
    it('blocks noncanonical paths to the redirect handler', async () => {
        Yo.findOne.mockResolvedValue({
            _id: 'alias-id',
            originalUrl: 'https://yo.test/api//redirect/other',
        })
        const result = await resolveRedirect({
            redirectParam: 'docs',
            req: buildReq(),
        })
        expect(result.status).toBe(400)
        expect(Yo.updateOne).not.toHaveBeenCalled()
    })
})
