import winston from 'winston'
import { getActiveSpanContext } from './tracing'

const addTraceContext = winston.format((info) => {
    const spanContext =
        typeof getActiveSpanContext === 'function'
            ? getActiveSpanContext()
            : null
    if (!spanContext) {
        return info
    }

    info.trace_id = spanContext.traceId
    info.span_id = spanContext.spanId
    info.trace_flags = spanContext.traceFlags

    return info
})

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        addTraceContext(),
        winston.format.json() // Log in JSON format for better structure in CloudWatch
    ),
    transports: [new winston.transports.Console()],
})

export default logger
