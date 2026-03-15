import { registerOTel } from '@vercel/otel'

export function register() {
    registerOTel({
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
