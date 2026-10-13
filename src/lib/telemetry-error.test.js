import { classifyTelemetryError } from './telemetry-error'

describe('classifyTelemetryError', () => {
    it.each([
        [{ code: 18 }, 'db_auth'],
        [{ code: 50 }, 'db_timeout'],
        [{ name: 'MongoNetworkTimeoutError' }, 'db_timeout'],
        [{ code: 'ETIMEDOUT' }, 'db_timeout'],
        [{ code: 'ENOTFOUND' }, 'dns'],
        [{ code: 'EAI_AGAIN' }, 'dns'],
        [{ code: 'CERT_HAS_EXPIRED' }, 'tls'],
        [{ code: 'ERR_TLS_CERT_ALTNAME_INVALID' }, 'tls'],
        [{ code: 'SELF_SIGNED_CERT_IN_CHAIN' }, 'tls'],
        [{ telemetryCategory: 'db_auth' }, 'db_auth'],
        [
            { telemetryCategory: 'private-secret', code: 'private-secret' },
            'unknown',
        ],
        [
            new Error('authentication failed mongodb://user:secret@host'),
            'unknown',
        ],
        [null, 'unknown'],
    ])('classifies %p as %s', (error, category) => {
        expect(classifyTelemetryError(error)).toBe(category)
    })

    it.each([
        ['ENOTFOUND', 'dns'],
        ['CERT_HAS_EXPIRED', 'tls'],
        ['ETIMEDOUT', 'db_timeout'],
        [18, 'db_auth'],
    ])(
        'classifies Mongoose topology failures with code %s',
        (code, expected) => {
            const networkError = Object.assign(new Error('private-host'), {
                name: 'MongoNetworkError',
                cause: Object.assign(new Error('private-password'), { code }),
            })
            const topology = {
                servers: new Map([
                    ['private-host:27017', { error: networkError }],
                ]),
                error: networkError,
            }
            const mongooseError = Object.assign(new Error('private-uri'), {
                name: 'MongooseServerSelectionError',
                reason: topology,
                cause: topology,
            })
            expect(classifyTelemetryError(mongooseError)).toBe(expected)
        }
    )

    it('checks server descriptions when the first topology error is unknown', () => {
        const topology = {
            error: new Error('private-host'),
            servers: new Map([
                ['first', { error: new Error('private-host') }],
                ['second', { error: { cause: { code: 'ENOTFOUND' } } }],
            ]),
        }
        expect(classifyTelemetryError({ reason: topology })).toBe('dns')
    })

    it('bounds wrapper depth and cycles across topology fields', () => {
        const cycle = { code: 'private-code' }
        cycle.reason = cycle
        cycle.error = cycle
        cycle.servers = new Map([['private-host', cycle]])
        expect(classifyTelemetryError(cycle)).toBe('unknown')
        const error = {
            cause: {
                cause: { cause: { cause: { cause: { code: 'ENOTFOUND' } } } },
            },
        }
        expect(classifyTelemetryError(error)).toBe('unknown')
    })

    it('bounds wide server maps', () => {
        const servers = new Map()
        for (let index = 0; index < 100; index += 1)
            servers.set(index, { error: new Error('private-host') })
        servers.set('last', { error: { code: 'ENOTFOUND' } })
        expect(classifyTelemetryError({ servers })).toBe('unknown')
    })

    it('finds nested driver codes and bounds cyclic causes', () => {
        expect(classifyTelemetryError({ cause: { code: 'ENOTFOUND' } })).toBe(
            'dns'
        )
        const error = new Error('private-secret')
        error.cause = error
        expect(classifyTelemetryError(error)).toBe('unknown')
    })
})
