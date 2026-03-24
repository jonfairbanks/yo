import validUrl from 'valid-url'

import { ApiError } from '../lib/api-error'
import { normalizeLinkName } from '../lib/link-name'
import { getReservedPathMatch } from '../lib/reserved-routes'

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100
export const SORT_FIELDS = new Set(['linkName', 'originalUrl', 'urlHits'])
export const SEARCH_MODE = 'case_insensitive_substring'
export const RECENT_WINDOW_DAYS = 30

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parsePositiveInteger = (value, defaultValue) => {
    const parsed = Number.parseInt(
        Array.isArray(value) ? value[0] : value || '',
        10
    )

    if (Number.isNaN(parsed) || parsed < 1) {
        return defaultValue
    }

    return parsed
}

export const normalizeRequiredLinkName = (
    linkName,
    errorMessage = 'A link name is required.'
) => {
    const normalizedLinkName = normalizeLinkName(linkName)

    if (!normalizedLinkName) {
        throw new ApiError(400, errorMessage, {
            code: 'invalid_alias',
        })
    }

    return normalizedLinkName
}

export const assertAliasIsNotReserved = (linkName) => {
    const reservedPath = getReservedPathMatch(linkName)

    if (reservedPath) {
        throw new ApiError(
            400,
            'This link name is reserved by the application.',
            {
                code: 'reserved_alias',
            }
        )
    }
}

export const assertValidOriginalUrl = (originalUrl) => {
    if (!validUrl.isUri(originalUrl)) {
        throw new ApiError(400, 'The provided URL is improperly formatted.', {
            code: 'invalid_url',
        })
    }
}

export const parseListAliasesQuery = (query) => {
    const page = parsePositiveInteger(query.page, 1)
    const pageSize = Math.min(
        parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE),
        MAX_PAGE_SIZE
    )
    const exactLinkName = normalizeLinkName(
        Array.isArray(query.exactLinkName)
            ? query.exactLinkName[0] || ''
            : query.exactLinkName || ''
    )
    const filterQuery = Array.isArray(query.q) ? query.q[0] || '' : query.q || ''
    const usageFilter = Array.isArray(query.usage)
        ? query.usage[0] || ''
        : query.usage || ''
    const recentFilter = Array.isArray(query.recent)
        ? query.recent[0] || ''
        : query.recent || ''
    const sinceDays = Math.min(
        parsePositiveInteger(query.sinceDays, RECENT_WINDOW_DAYS),
        365
    )
    const requestedSortBy = Array.isArray(query.sortBy)
        ? query.sortBy[0] || ''
        : query.sortBy || ''
    const sortBy = SORT_FIELDS.has(requestedSortBy)
        ? requestedSortBy
        : 'linkName'
    const sortDir =
        (Array.isArray(query.sortDir) ? query.sortDir[0] : query.sortDir) ===
        'desc'
            ? -1
            : 1
    const trimmedFilter = filterQuery.trim()
    const recentThreshold = new Date(
        Date.now() - sinceDays * 24 * 60 * 60 * 1000
    )
    const filters = []

    if (exactLinkName) {
        filters.push({ linkName: exactLinkName })
    } else if (trimmedFilter) {
        filters.push({
            $or: [
                {
                    linkName: {
                        $regex: escapeRegex(trimmedFilter),
                        $options: 'i',
                    },
                },
                {
                    originalUrl: {
                        $regex: escapeRegex(trimmedFilter),
                        $options: 'i',
                    },
                },
            ],
        })
    }

    if (usageFilter === 'unused') {
        filters.push({
            $or: [{ urlHits: { $exists: false } }, { urlHits: { $lte: 0 } }],
        })
    }

    if (usageFilter === 'active') {
        filters.push({ urlHits: { $gt: 0 } })
    }

    if (recentFilter === 'created') {
        filters.push({ createdAt: { $gte: recentThreshold } })
    }

    if (recentFilter === 'accessed') {
        filters.push({ lastAccess: { $gte: recentThreshold } })
    }

    const searchQuery =
        filters.length === 0 ? {} : filters.length === 1 ? filters[0] : { $and: filters }

    return {
        exactLinkName,
        page,
        pageSize,
        searchMode: SEARCH_MODE,
        searchQuery,
        searchTerm: trimmedFilter,
        sinceDays,
        sortBy,
        sortDir,
        usageFilter,
        recentFilter,
    }
}
