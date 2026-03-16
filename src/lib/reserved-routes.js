import { normalizeLinkName } from './link-name'

const RESERVED_EXACT_PATHS = new Set([
    'api',
    'auth',
    '_next',
    'favicon.ico',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
])

const RESERVED_PREFIX_PATHS = ['api/', 'auth/', '_next/']

export const getReservedPathMatch = (linkName) => {
    const normalized = normalizeLinkName(linkName)
    if (!normalized) return null

    if (RESERVED_EXACT_PATHS.has(normalized)) {
        return normalized
    }

    return RESERVED_PREFIX_PATHS.find((prefix) =>
        normalized.startsWith(prefix)
    )
}

export const isReservedPath = (linkName) => getReservedPathMatch(linkName) !== null
