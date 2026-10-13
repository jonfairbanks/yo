import { SpanStatusCode, trace } from '@opentelemetry/api'
import { classifyTelemetryError } from './telemetry-error'

const tracer = trace.getTracer('yo-api')

const setAttributes = (span, attributes = {}) => {
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return
        }

        if (
            Array.isArray(value) ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            span.setAttribute(key, value)
            return
        }

        span.setAttribute(key, String(value))
    })
}

export const recordSpanError = (spanOrError, maybeError) => {
    const explicitSpan = maybeError !== undefined
    const span = explicitSpan ? spanOrError : trace.getActiveSpan()
    const error = explicitSpan ? maybeError : spanOrError

    if (!span) {
        return
    }

    span.setAttribute('error.category', classifyTelemetryError(error))
    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Operation failed',
    })
}

export const setSpanAttributes = (attributes = {}) => {
    const span = trace.getActiveSpan()
    if (!span) {
        return
    }

    setAttributes(span, attributes)
}

export const getActiveSpanContext = () => trace.getActiveSpan()?.spanContext()

export const withSpan = async (name, attributesOrCallback, maybeCallback) => {
    const attributes =
        typeof attributesOrCallback === 'function'
            ? {}
            : attributesOrCallback || {}
    const callback =
        typeof attributesOrCallback === 'function'
            ? attributesOrCallback
            : maybeCallback

    if (typeof callback !== 'function') {
        throw new TypeError('withSpan requires a callback')
    }

    return tracer.startActiveSpan(name, async (span) => {
        setAttributes(span, attributes)

        try {
            return await callback(span)
        } catch (error) {
            recordSpanError(span, error)
            throw error
        } finally {
            span.end()
        }
    })
}
