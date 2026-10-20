import { registerOTel } from '@vercel/otel'
import { createTraceSampler } from './lib/trace-sampler'
import { createTelemetryResourceDetector } from './lib/telemetry-resource'

export async function register() {
    process.env.OTEL_BSP_MAX_QUEUE_SIZE = '256'
    process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE = '64'
    process.env.OTEL_BSP_EXPORT_TIMEOUT = '5000'
    const version =
        process.env.NEXT_RUNTIME === 'nodejs'
            ? (await import('./lib/build-version')).readBuildVersion()
            : 'unknown'
    registerOTel({
        traceSampler: createTraceSampler(),
        spanLimits: {
            attributeCountLimit: 32,
            attributeValueLengthLimit: 128,
            eventCountLimit: 8,
        },
        serviceName: process.env.OTEL_SERVICE_NAME || 'yo-url',
        resourceDetectors: [createTelemetryResourceDetector(version)],
    })
}
