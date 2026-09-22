import { ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api'
import { createTraceSampler } from './trace-sampler'

const context = (isRemote, traceFlags) =>
    trace.setSpanContext(ROOT_CONTEXT, {
        traceId: '12345678901234567890123456789012',
        spanId: '1234567890123456',
        isRemote,
        traceFlags,
    })

it('bounds new traces regardless of remote sampling flags', () => {
    const sampler = createTraceSampler()
    const parent = context(true, TraceFlags.SAMPLED)
    for (let i = 0; i < 10; i++)
        expect(sampler.shouldSample(parent).decision).toBe(2)
    expect(sampler.shouldSample(parent).decision).toBe(0)
    expect(sampler.shouldSample(ROOT_CONTEXT).decision).toBe(0)
})

it('preserves local sampling decisions for child spans', () => {
    const sampler = createTraceSampler()
    expect(
        sampler.shouldSample(context(false, TraceFlags.SAMPLED)).decision
    ).toBe(2)
    expect(sampler.shouldSample(context(false, TraceFlags.NONE)).decision).toBe(
        0
    )
})
