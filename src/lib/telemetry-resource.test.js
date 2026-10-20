/** @jest-environment node */
import {
    detectResources,
    resourceFromAttributes,
} from '@opentelemetry/resources'
import { createTelemetryResourceDetector } from './telemetry-resource'

describe('Telemetry Resources', () => {
    const originalEnv = process.env
    beforeEach(() => {
        process.env = { ...originalEnv }
        delete process.env.OTEL_RESOURCE_ATTRIBUTES
        delete process.env.OTEL_SERVICE_NAME
        delete process.env.VERCEL
        delete process.env.VERCEL_ENV
    })
    afterEach(() => {
        process.env = originalEnv
    })

    const detect = (version = 'a'.repeat(40)) =>
        createTelemetryResourceDetector(version).detect().attributes

    it('preserves deployment fields but overrides a stale configured version', () => {
        process.env.OTEL_RESOURCE_ATTRIBUTES =
            'cloud.provider=aws,cloud.platform=aws_app_runner,cloud.region=us-east-1,deployment.environment=production,service.version=0.1.0,custom.field=one%2Ctwo'
        process.env.OTEL_SERVICE_NAME = 'yo-url'
        expect(detect()).toEqual({
            'cloud.provider': 'aws',
            'cloud.platform': 'aws_app_runner',
            'cloud.region': 'us-east-1',
            'deployment.environment': 'production',
            'deployment.environment.name': 'production',
            'service.name': 'yo-url',
            'service.version': 'a'.repeat(40),
            'custom.field': 'one,two',
        })
    })

    it('does not assume Vercel for local or unspecified hosting', () => {
        process.env.NODE_ENV = 'production'
        expect(detect()['cloud.provider']).toBe('unknown')
    })

    it('recognizes an explicit Vercel runtime', () => {
        process.env.VERCEL = '1'
        process.env.VERCEL_ENV = 'preview'
        expect(detect()).toMatchObject({
            'cloud.provider': 'vercel',
            'deployment.environment.name': 'preview',
        })
    })

    it('uses the installed resource merge behavior to replace SDK defaults', () => {
        process.env.OTEL_RESOURCE_ATTRIBUTES = 'service.version=0.1.0'
        const resource = resourceFromAttributes({
            'cloud.provider': 'vercel',
            'service.version': 'sdk-default',
        }).merge(
            detectResources({
                detectors: [createTelemetryResourceDetector('build_123')],
            })
        )
        expect(resource.attributes).toMatchObject({
            'cloud.provider': 'unknown',
            'service.version': 'build_123',
        })
    })
})
