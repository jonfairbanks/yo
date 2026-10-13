import { createMocks } from 'node-mocks-http'

import logger from '../../../lib/logger'
import { recordSpanError, withSpan } from '../../../lib/tracing'
import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/redirect/[...redirect]'
import { resolveAlias } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    resolveAlias: jest.fn(),
}))

jest.mock('../../../lib/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock('../../../lib/tracing', () => ({
    recordSpanError: jest.fn(),
    withSpan: jest.fn(async (_name, attributesOrCallback, maybeCallback) => {
        const callback =
            typeof attributesOrCallback === 'function'
                ? attributesOrCallback
                : maybeCallback

        const span = { setAttribute: jest.fn() }
        withSpan.spans.push(span)
        return callback(span)
    }),
}))

describe('/api/redirect/[...redirect]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        withSpan.spans = []
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
        expect(resolveAlias).not.toHaveBeenCalled()
    })

    it('redirects when the alias resolves', async () => {
        resolveAlias.mockResolvedValue({
            status: 302,
            targetUrl: 'https://example.com/docs?token=private-marker#secret',
        })

        const { req, res } = createMocks({
            method: 'GET',
            query: {
                redirect: [' /Docs/ '],
            },
        })

        await handler(req, res)

        expect(resolveAlias).toHaveBeenCalledWith({
            redirectParam: ' /Docs/ ',
            req,
        })
        expect(res._getStatusCode()).toBe(302)
        expect(res._getRedirectUrl()).toBe(
            'https://example.com/docs?token=private-marker#secret'
        )
        expect(logger.info).toHaveBeenCalledTimes(1)
        expect(logger.info).toHaveBeenCalledWith({
            event: 'redirect_success',
            alias: 'docs',
            status: 302,
        })
        expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
            'http.response.status_code',
            302
        )
        expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
            'private-marker'
        )
        expect(
            JSON.stringify(withSpan.spans[0].setAttribute.mock.calls)
        ).not.toContain('private-marker')
    })

    it.each([400, 404, 429, 500])(
        'does not log completion for status %s',
        async (status) => {
            resolveAlias.mockResolvedValue({
                status,
                error: 'Failed redirect.',
                retryAfter: 1,
            })
            const { req, res } = createMocks({
                method: 'GET',
                query: { redirect: ['docs'] },
            })
            await handler(req, res)
            expect(res._getStatusCode()).toBe(status)
            expect(logger.info).not.toHaveBeenCalled()
            expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
                'http.response.status_code',
                status
            )
            if (status === 500) expect(recordSpanError).toHaveBeenCalledTimes(1)
        }
    )

    it('keeps the completed redirect when completion logging fails', async () => {
        const destination = 'https://example.com/docs'
        resolveAlias.mockResolvedValue({ status: 302, targetUrl: destination })
        logger.info.mockImplementationOnce(() => {
            throw new Error('Logger failed')
        })
        const { req, res } = createMocks({
            method: 'GET',
            query: { redirect: ['docs'] },
        })
        const json = jest.spyOn(res, 'json')
        await handler(req, res)
        expect(res._getStatusCode()).toBe(302)
        expect(res._getRedirectUrl()).toBe(destination)
        expect(json).not.toHaveBeenCalled()
        expect(recordSpanError).not.toHaveBeenCalled()
        expect(logger.error).not.toHaveBeenCalled()
    })

    it('does not log completion after an unexpected failure', async () => {
        resolveAlias.mockRejectedValue(new Error('private-marker'))
        const { req, res } = createMocks({
            method: 'GET',
            query: { redirect: ['docs'] },
        })
        await handler(req, res)
        expect(res._getStatusCode()).toBe(500)
        expect(recordSpanError).toHaveBeenCalledTimes(1)
        expect(logger.info).not.toHaveBeenCalled()
    })

    it('returns structured JSON errors for blocked aliases', async () => {
        resolveAlias.mockResolvedValue({
            error: 'Destination points back to this short link.',
            status: 400,
        })

        const { req, res } = createMocks({
            method: 'GET',
            query: {
                redirect: ['docs'],
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'Destination points back to this short link.',
        })
    })
    it('returns the overload status and retry header', async () => {
        resolveAlias.mockResolvedValue({
            status: 429,
            error: 'Too many requests. Try again shortly.',
            retryAfter: 1,
        })
        const { req, res } = createMocks({
            method: 'GET',
            query: { redirect: ['docs'] },
        })
        await handler(req, res)
        expect(res._getStatusCode()).toBe(429)
        expect(res.getHeader('Retry-After')).toBe('1')
        expect(res.getHeader('Cache-Control')).toBe('private, no-store')
    })
})
