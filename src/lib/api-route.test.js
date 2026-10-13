import { createMocks } from 'node-mocks-http'
import { createApiHandler } from './api-route'
import { ApiError } from './api-error'
import logger from './logger'
import { recordSpanError, withSpan } from './tracing'

jest.mock('./auth0', () => ({ auth0: { getSession: jest.fn() } }))
jest.mock('./logger', () => ({
    __esModule: true,
    default: { error: jest.fn(), warn: jest.fn() },
}))
jest.mock('./tracing', () => ({
    withSpan: jest.fn(),
    recordSpanError: jest.fn(),
}))

describe('createApiHandler failure telemetry', () => {
    let span
    beforeEach(() => {
        jest.clearAllMocks()
        span = { setAttribute: jest.fn() }
        withSpan.mockImplementation(async (_name, _attributes, callback) =>
            callback(span)
        )
    })

    const runFailure = async (error, options = {}) => {
        const { req, res } = createMocks({ method: 'GET' })
        await createApiHandler(
            {
                method: 'GET',
                name: 'GET /api/test',
                route: '/api/test',
                ...options,
            },
            async () => {
                throw error
            }
        )(req, res)
        return res
    }

    it.each([400, 401, 404, 429])(
        'keeps handled %i responses out of error telemetry',
        async (status) => {
            const res = await runFailure(new ApiError(status, 'Request failed'))
            expect(res._getStatusCode()).toBe(status)
            expect(recordSpanError).not.toHaveBeenCalled()
            expect(logger.error).not.toHaveBeenCalled()
        }
    )

    it('marks typed 500 responses as span errors with a bounded category', async () => {
        const error = new ApiError(500, 'Request failed')
        const res = await runFailure(error)
        expect(res._getStatusCode()).toBe(500)
        expect(recordSpanError).toHaveBeenCalledWith(span, error)
        expect(logger.error).toHaveBeenCalledWith({
            event: 'request_failed',
            route: '/api/test',
            status: 500,
            category: 'unknown',
        })
    })

    it('marks untyped failures and logs only the category', async () => {
        const secret = 'mongodb://user:private-password@private-host'
        const error = Object.assign(new Error(secret), {
            telemetryCategory: 'db_auth',
        })
        const res = await runFailure(error)
        expect(res._getStatusCode()).toBe(500)
        expect(recordSpanError).toHaveBeenCalledWith(span, error)
        expect(logger.error).toHaveBeenCalledWith({
            event: 'request_failed',
            route: '/api/test',
            status: 500,
            category: 'db_auth',
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain(secret)
        expect(res._getData()).not.toContain(secret)
    })

    it('marks failures even when a custom onError callback handles logging', async () => {
        const onError = jest.fn()
        const error = new Error('Failure')
        await runFailure(error, { onError })
        expect(recordSpanError).toHaveBeenCalledWith(span, error)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(logger.error).not.toHaveBeenCalled()
    })
})
