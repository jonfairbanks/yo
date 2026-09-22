/** @jest-environment node */
import { createClientIpResolver } from './client-ip'

const request = (ip, forwarded) => ({
    socket: { remoteAddress: ip },
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
})

it('uses the direct peer unless its proxy address is explicitly trusted', () => {
    expect(createClientIpResolver()(request('192.0.2.1', '198.51.100.1'))).toBe(
        '192.0.2.1'
    )
    expect(
        createClientIpResolver('10.0.0.0/24')(
            request('192.0.2.1', '198.51.100.1')
        )
    ).toBe('192.0.2.1')
})

it('walks only trusted proxy hops, from the socket toward the client', () => {
    const resolve = createClientIpResolver('10.0.0.0/24,2001:db8:1::/48')
    expect(resolve(request('10.0.0.1', '192.0.2.1'))).toBe('192.0.2.1')
    expect(resolve(request('10.0.0.1', '192.0.2.1, 2001:db8:1::1'))).toBe(
        '192.0.2.1'
    )
    expect(resolve(request('10.0.0.1', '198.51.100.1, 192.0.2.1'))).toBe(
        '192.0.2.1'
    )
})

it('canonicalizes equivalent IPv6 and IPv4-mapped addresses', () => {
    const resolve = createClientIpResolver()
    expect(resolve(request('2001:0DB8:0:0:0:0:0:1'))).toBe('2001:db8::1')
    expect(resolve(request('::ffff:192.0.2.1'))).toBe('192.0.2.1')
    expect(resolve(request('::ffff:c000:201'))).toBe('192.0.2.1')
    expect(
        createClientIpResolver('10.0.0.0/24')(
            request('::ffff:10.0.0.1', '192.0.2.1')
        )
    ).toBe('192.0.2.1')
})

it('handles missing identity and malformed trusted forwarding explicitly', () => {
    const resolve = createClientIpResolver('10.0.0.0/24')
    expect(resolve({})).toBeNull()
    expect(resolve(request('10.0.0.1'))).toBe('10.0.0.1')
    expect(resolve(request('10.0.0.1', 'invalid'))).toBeNull()
    expect(resolve(request('10.0.0.1', ['192.0.2.1']))).toBeNull()
})

it.each(['bad', '10.0.0.0/33', '10.0.0.0/no', '10.0.0.0/24/1'])(
    'rejects invalid proxy configuration: %s',
    (config) => {
        expect(() => createClientIpResolver(config)).toThrow(
            'Invalid TRUSTED_PROXY_CIDRS configuration'
        )
    }
)
