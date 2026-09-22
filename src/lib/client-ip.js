import { BlockList, isIP } from 'node:net'

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

export const createClientIpResolver = (trustedProxyCidrs = '') => {
    const proxies = new BlockList()
    for (const entry of trustedProxyCidrs.split(',').filter((v) => v.trim())) {
        const [address, prefix, extra] = entry.trim().split('/')
        const version = isIP(address)
        if (
            !version ||
            extra !== undefined ||
            (prefix !== undefined && !/^\d+$/.test(prefix))
        ) {
            throw new Error('Invalid TRUSTED_PROXY_CIDRS configuration')
        }
        const type = version === 4 ? 'ipv4' : 'ipv6'
        try {
            if (prefix === undefined) proxies.addAddress(address, type)
            else proxies.addSubnet(address, Number(prefix), type)
        } catch {
            throw new Error('Invalid TRUSTED_PROXY_CIDRS configuration')
        }
    }
    const trusted = (address) =>
        proxies.check(address, isIP(address) === 4 ? 'ipv4' : 'ipv6')

    return (req) => {
        let address = normalizeIp(req?.socket?.remoteAddress)
        if (!address || !trusted(address)) return address
        const forwarded = req.headers?.['x-forwarded-for']
        if (forwarded === undefined) return address
        if (typeof forwarded !== 'string' || forwarded.length > 4096)
            return null
        const chain = forwarded.split(',')
        if (chain.length > 32) return null
        // Stop at the first untrusted hop, even if more values precede it.
        for (let i = chain.length - 1; i >= 0 && trusted(address); i -= 1) {
            address = normalizeIp(chain[i])
            if (!address) return null
        }
        return address
    }
}

let cachedConfig
let resolver

export const getClientIp = (req) => {
    const config = process.env.TRUSTED_PROXY_CIDRS || ''
    if (!resolver || config !== cachedConfig) {
        resolver = createClientIpResolver(config)
        cachedConfig = config
    }
    return resolver(req)
}
