import { createMocks } from 'node-mocks-http'

import handler from '../../../../pages/api/public/[...path]'

jest.mock('../../../../lib/logger', () => ({
    __esModule: true,
    default: {
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

describe('public file handler', () => {
    it('serves css files with a text/css content type', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: {
                path: ['vendor', 'materialize', 'materialize.min.css'],
            },
        })

        await handler(req, res)

        const body = res._getData()
        const content = Buffer.isBuffer(body) ? body.toString('utf8') : body

        expect(res._getStatusCode()).toBe(200)
        expect(res.getHeader('Content-Type')).toBe('text/css; charset=utf-8')
        expect(content).toContain('Materialize')
    })
})
