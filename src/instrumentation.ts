import { registerOTel } from '@vercel/otel'
import { createTraceSampler } from './lib/trace-sampler'

export function register() {
    process.env.OTEL_BSP_MAX_QUEUE_SIZE = '256'
    process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE = '64'
    process.env.OTEL_BSP_EXPORT_TIMEOUT = '5000'
    registerOTel({
        traceSampler: createTraceSampler(),
        spanLimits: {
            attributeCountLimit: 32,
            attributeValueLengthLimit: 128,
            eventCountLimit: 8,
        },
        serviceName: process.env.OTEL_SERVICE_NAME || 'yo-url',
        attributes: {
            'deployment.environment':
                process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
            'service.version':
                process.env.VERCEL_GIT_COMMIT_SHA ||
                process.env.npm_package_version,
        },
    })
}
