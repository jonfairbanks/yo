/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@opentelemetry/api', () => {
    const end = jest.fn()
    const recordException = jest.fn()
    const setAttribute = jest.fn()
    const setStatus = jest.fn()
    const spanContext = jest.fn(() => ({
        spanId: 'span-id',
        traceFlags: 1,
        traceId: 'trace-id',
    }))
    const activeSpan = {
        recordException,
        setAttribute,
        setStatus,
        spanContext,
    }
    const getActiveSpan = jest.fn(() => activeSpan)
    const startActiveSpan = jest.fn(async (name, callback) =>
        callback({
            end,
            recordException,
            setAttribute,
            setStatus,
        })
    )
    const getTracer = jest.fn(() => ({
        startActiveSpan,
    }))

    return {
        SpanStatusCode: {
            ERROR: 'ERROR',
        },
        __mock: {
            activeSpan,
            end,
            getActiveSpan,
            getTracer,
            recordException,
            setAttribute,
            setStatus,
            startActiveSpan,
        },
        trace: {
            getActiveSpan,
            getTracer,
        },
    }
})

const { __mock } = require('@opentelemetry/api')
const {
    getActiveSpanContext,
    recordSpanError,
    setSpanAttributes,
    withSpan,
} = require('./tracing')

describe('tracing helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        __mock.getActiveSpan.mockReturnValue(__mock.activeSpan)
    })

    it('creates a span, applies attributes, and ends it', async () => {
        await expect(
            withSpan('yo.test', { 'yo.alias': 'hello' }, async () => 'ok')
        ).resolves.toBe('ok')

        expect(__mock.startActiveSpan).toHaveBeenCalledWith(
            'yo.test',
            expect.any(Function)
        )
        expect(__mock.setAttribute).toHaveBeenCalledWith('yo.alias', 'hello')
        expect(__mock.end).toHaveBeenCalled()
    })

    it('records span errors on the active span', () => {
        const error = new Error('boom')

        recordSpanError(error)

        expect(__mock.recordException).toHaveBeenCalledWith(error)
        expect(__mock.setStatus).toHaveBeenCalledWith({
            code: 'ERROR',
            message: 'boom',
        })
    })

    it('returns the active span context when present', () => {
        setSpanAttributes({ 'yo.result': 'created' })

        expect(__mock.setAttribute).toHaveBeenCalledWith('yo.result', 'created')
        expect(getActiveSpanContext()).toEqual({
            spanId: 'span-id',
            traceFlags: 1,
            traceId: 'trace-id',
        })
    })
})
