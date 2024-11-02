import { registerOTel } from '@vercel/otel'

export function register() {
    console.log(`OTLP Export Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
    console.log(`OTLP Zipkin Endpoint: ${process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT}`);
    console.log(`OTLP Jaeger Endpoint: ${process.env.OTEL_EXPORTER_JAEGER_ENDPOINT}`);

    registerOTel({ 
        serviceName: 'yo-api'
    })
}
