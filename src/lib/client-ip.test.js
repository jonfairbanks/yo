/** @jest-environment node */
import { createClientIpResolver, getClientIp } from './client-ip'

const request = (ip, forwarded) => ({
    socket: { remoteAddress: ip },
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
    rawHeaders: forwarded === undefined ? [] : ['X-Forwarded-For', forwarded],
})

it('ignores forwarding headers in direct-hosting mode', () => {
    expect(createClientIpResolver()(request('192.0.2.1', '198.51.100.1'))).toBe(
        '192.0.2.1'
    )
    expect(createClientIpResolver('socket')({})).toBeNull()
})

it('uses the final forwarded address in App Runner mode, independent of the internal peer', () => {
    const resolve = createClientIpResolver('apprunner')
    expect(resolve(request('10.0.0.1', '192.0.2.1'))).toBe('192.0.2.1')
    expect(resolve(request('10.0.0.2', '198.51.100.1, 192.0.2.1'))).toBe(
        '192.0.2.1'
    )
    expect(resolve(request('10.0.0.1', '198.51.100.2, 192.0.2.1'))).toBe(
        '192.0.2.1'
    )
    expect(resolve(request('10.0.0.1', '192.0.2.2'))).toBe('192.0.2.2')
})

it.each(['socket', 'apprunner'])(
    'canonicalizes IPv6 and mapped IPv4 in %s mode',
    (mode) => {
        const resolve = createClientIpResolver(mode)
        const input = (ip) =>
            mode === 'socket' ? request(ip) : request('10.0.0.1', ip)
        expect(resolve(input('2001:0DB8:0:0:0:0:0:1'))).toBe('2001:db8::1')
        expect(resolve(input('::ffff:192.0.2.1'))).toBe('192.0.2.1')
        expect(resolve(input('::ffff:c000:201'))).toBe('192.0.2.1')
    }
)

it.each([
    undefined,
    '',
    'invalid',
    ['192.0.2.1'],
    '192.0.2.1,',
    ',192.0.2.1',
    'unknown, 192.0.2.1',
    '192.0.2.1, invalid',
    'x'.repeat(4097),
    Array(33).fill('192.0.2.1').join(','),
])('rejects unavailable or malformed App Runner identity: %p', (header) => {
    expect(
        createClientIpResolver('apprunner')(request('10.0.0.1', header))
    ).toBeNull()
})

it('rejects an unsupported mode', () => {
    expect(() => createClientIpResolver('unknown')).toThrow(
        'Invalid YO_CLIENT_IP_SOURCE configuration'
    )
})

it('rejects a framework-synthesized header and duplicate original headers', () => {
    const resolve = createClientIpResolver('apprunner')
    const synthetic = request('10.0.0.1')
    synthetic.headers['x-forwarded-for'] = '10.0.0.1'
    expect(resolve(synthetic)).toBeNull()
    const duplicate = request('10.0.0.1', '192.0.2.1')
    duplicate.rawHeaders.push('x-forwarded-for', '192.0.2.2')
    expect(resolve(duplicate)).toBeNull()
})

it('reads the startup mode without carrying over the previous resolver', () => {
    const original = process.env.YO_CLIENT_IP_SOURCE
    try {
        process.env.YO_CLIENT_IP_SOURCE = 'apprunner'
        expect(getClientIp(request('10.0.0.1', '192.0.2.1'))).toBe('192.0.2.1')
        process.env.YO_CLIENT_IP_SOURCE = 'socket'
        expect(getClientIp(request('10.0.0.1', '192.0.2.1'))).toBe('10.0.0.1')
    } finally {
        if (original === undefined) delete process.env.YO_CLIENT_IP_SOURCE
        else process.env.YO_CLIENT_IP_SOURCE = original
    }
})
