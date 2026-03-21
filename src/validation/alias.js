import validUrl from 'valid-url'

import { ApiError } from '../lib/api-error'
import { normalizeLinkName } from '../lib/link-name'
import { getReservedPathMatch } from '../lib/reserved-routes'

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100
export const SORT_FIELDS = new Set(['linkName', 'originalUrl', 'urlHits'])
export const SEARCH_MODE = 'case_insensitive_substring'

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
    const filterQuery = Array.isArray(query.q) ? query.q[0] || '' : query.q || ''
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
    const searchQuery = trimmedFilter
        ? {
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
          }
        : {}

    return {
        page,
        pageSize,
        searchMode: SEARCH_MODE,
        searchQuery,
        searchTerm: trimmedFilter,
        sortBy,
        sortDir,
    }
}
