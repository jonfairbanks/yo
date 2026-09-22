import { trace, TraceFlags } from '@opentelemetry/api'
import { createTokenBucket } from './request-budget'

export const createTraceSampler = () => {
    const take = createTokenBucket({ rate: 5, capacity: 10 })
    return {
        shouldSample(context) {
            const parent = trace.getSpanContext(context)
            // Preserve local traces; remote callers cannot force sampling.
            const sampled =
                parent && !parent.isRemote
                    ? Boolean(parent.traceFlags & TraceFlags.SAMPLED)
                    : take()
            // OpenTelemetry SamplingDecision: NOT_RECORD = 0, RECORD_AND_SAMPLED = 2.
            return { decision: sampled ? 2 : 0 }
        },
        toString: () => 'YoBoundedRootSampler',
    }
}
