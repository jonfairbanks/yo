import { envDetector } from '@opentelemetry/resources'

export const createTelemetryResourceDetector = (version) => ({
    detect() {
        const { attributes } = envDetector.detect()
        const provider =
            attributes['cloud.provider'] ||
            (process.env.VERCEL === '1' ? 'vercel' : 'unknown')
        const environment =
            attributes['deployment.environment.name'] ||
            attributes['deployment.environment'] ||
            process.env.VERCEL_ENV ||
            process.env.NODE_ENV ||
            'development'
        return {
            attributes: {
                ...attributes,
                'cloud.provider': provider,
                'deployment.environment': environment,
                'deployment.environment.name': environment,
                // The artifact identity wins over stale runtime environment values.
                'service.version': version,
            },
        }
    },
})
