import { isIP } from 'node:net'

const normalizeIp = (value) => {
    if (typeof value !== 'string') return null
    const address = value.trim()
    const version = isIP(address)
    if (version === 4) return address
    if (version !== 6 || address.includes('%')) return null
    const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1)
    const mapped = canonical.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/)
    if (!mapped) return canonical
    const high = parseInt(mapped[1], 16)
    const low = parseInt(mapped[2], 16)
    return [high >> 8, high & 255, low >> 8, low & 255].join('.')
}

export const createClientIpResolver = (source = 'socket') => {
    if (!['socket', 'apprunner'].includes(source)) {
        throw new Error('Invalid YO_CLIENT_IP_SOURCE configuration')
    }

    return (req) => {
        if (source === 'socket') return normalizeIp(req?.socket?.remoteAddress)

        // Only for a public App Runner endpoint with no upstream CDN/proxy.
        // Use the final source address supplied by the managed ingress.
        // Next.js synthesizes req.headers XFF from the socket when absent.
        // Require exactly one original ingress header instead of that fallback.
        if (!Array.isArray(req?.rawHeaders)) return null
        const originalHeaders = []
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            if (req.rawHeaders[i]?.toLowerCase() === 'x-forwarded-for') {
                originalHeaders.push(req.rawHeaders[i + 1])
            }
        }
        if (originalHeaders.length !== 1) return null
        const forwarded = originalHeaders[0]
        if (typeof forwarded !== 'string' || forwarded.length > 4096)
            return null
        const chain = forwarded.split(',')
        if (chain.length > 32) return null
        const addresses = chain.map(normalizeIp)
        if (addresses.some((address) => !address)) return null
        return addresses.at(-1)
    }
}

let cachedConfig
let resolver

export const getClientIp = (req) => {
    const config = process.env.YO_CLIENT_IP_SOURCE || 'socket'
    if (!resolver || config !== cachedConfig) {
        resolver = createClientIpResolver(config)
        cachedConfig = config
    }
    return resolver(req)
}
