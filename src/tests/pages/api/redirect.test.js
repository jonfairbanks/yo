import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/redirect/[...redirect]'
import { resolveRedirect } from '../../../lib/redirect'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../lib/redirect', () => ({
    resolveRedirect: jest.fn(),
}))

jest.mock('../../../lib/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
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

describe('/api/redirect/[...redirect]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
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
        expect(resolveRedirect).not.toHaveBeenCalled()
    })

    it('redirects when the alias resolves', async () => {
        resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: 'https://example.com/docs',
        })

        const { req, res } = createMocks({
            method: 'GET',
            query: {
                redirect: ['docs'],
            },
        })

        await handler(req, res)

        expect(resolveRedirect).toHaveBeenCalledWith({
            redirectParam: 'docs',
            req,
        })
        expect(res._getStatusCode()).toBe(302)
        expect(res._getRedirectUrl()).toBe('https://example.com/docs')
    })

    it('returns structured JSON errors for blocked aliases', async () => {
        resolveRedirect.mockResolvedValue({
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
})
