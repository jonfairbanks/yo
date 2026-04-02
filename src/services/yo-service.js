import logger from '../lib/logger'
import { resolveRedirect } from '../lib/redirect'
import { ApiError } from '../lib/api-error'
import {
    deleteAliasByLinkName,
    findAliases,
    findLatestAliases,
    findPopularAliases,
    findStatsSummary,
    insertAlias,
    updateAliasByLinkName,
} from '../repositories/yo-repository'
import {
    assertAliasIsNotReserved,
    assertValidOriginalUrl,
    normalizeRequiredLinkName,
    parseListAliasesQuery,
} from '../validation/alias'

const DUPLICATE_KEY_ERROR_CODE = 11000
const RECENT_WINDOW_DAYS = 30

const isDuplicateKeyError = (error) =>
    Boolean(error) &&
    typeof error === 'object' &&
    error.code === DUPLICATE_KEY_ERROR_CODE

const withDefaultHits = (item) => ({
    ...item,
    urlHits: typeof item.urlHits === 'number' ? item.urlHits : 0,
})

const toIsoDateField = (item, key) => {
    if (!item || !item[key]) {
        return null
    }

    const parsed = new Date(item[key])
    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    return {
        ...item,
        [key]: parsed.toISOString(),
    }
}

export const createAlias = async ({ linkName, originalUrl, shortBaseUrl, span }) => {
    const normalizedLinkName = normalizeRequiredLinkName(linkName)
    span?.setAttribute('yo.alias', normalizedLinkName)
    assertAliasIsNotReserved(normalizedLinkName)
    assertValidOriginalUrl(originalUrl)

    try {
        const item = await insertAlias({
            linkName: normalizedLinkName,
            originalUrl,
            shortUrl: `${shortBaseUrl}/${normalizedLinkName}`,
        })

        span?.setAttribute('yo.result', 'created')
        logger.info({
            event: 'alias_created',
            alias: normalizedLinkName,
            originalUrl,
        })

        return {
            linkName: item.linkName,
            originalUrl: item.originalUrl,
            shortUrl: item.shortUrl,
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            logger.warn({
                event: 'alias_create_conflict',
                alias: normalizedLinkName,
                status: 409,
            })
            throw new ApiError(
                409,
                'This name is already in-use. Please select another name.',
                {
                    code: 'already_exists',
                }
            )
        }

        logger.error({
            event: 'alias_create_failed',
            alias: normalizedLinkName,
            originalUrl,
            error: error instanceof Error ? error.message : String(error),
        })
        throw error
    }
}

export const updateAlias = async ({ linkName, originalUrl, span }) => {
    const normalizedLinkName = normalizeRequiredLinkName(linkName)
    span?.setAttribute('yo.alias', normalizedLinkName)
    assertAliasIsNotReserved(normalizedLinkName)
    assertValidOriginalUrl(originalUrl)

    const item = await updateAliasByLinkName({
        linkName: normalizedLinkName,
        originalUrl,
    })

    if (!item) {
        logger.warn({
            event: 'alias_update_missing',
            alias: normalizedLinkName,
            status: 404,
        })
        throw new ApiError(404, `Alias ${normalizedLinkName} not found.`, {
            code: 'missing',
        })
    }

    span?.setAttribute('yo.result', 'updated')
    logger.info({
        event: 'alias_updated',
        alias: normalizedLinkName,
        originalUrl,
    })

    return {
        message: `${normalizedLinkName} updated successfully.`,
    }
}

export const deleteAlias = async ({ linkName, actorNickname, span }) => {
    const normalizedLinkName = normalizeRequiredLinkName(
        linkName,
        'No link name provided.'
    )
    span?.setAttribute('yo.alias', normalizedLinkName)

    const item = await deleteAliasByLinkName(normalizedLinkName)

    if (!item) {
        logger.warn({
            event: 'alias_delete_missing',
            alias: normalizedLinkName,
            status: 404,
        })
        throw new ApiError(404, `Alias ${normalizedLinkName} not found.`, {
            code: 'missing',
        })
    }

    span?.setAttribute('yo.result', 'deleted')
    logger.info({
        event: 'alias_deleted',
        actorNickname: actorNickname || 'unknown',
        alias: normalizedLinkName,
        originalUrl: item.originalUrl,
    })

    return {
        message: `${normalizedLinkName} deleted successfully.`,
    }
}

export const listAliases = async ({ query, span }) => {
    const { page, pageSize, searchMode, searchQuery, searchTerm, sortBy, sortDir } =
        parseListAliasesQuery(query)
    const yoUrls = await findAliases({
        page,
        pageSize,
        searchQuery,
        sortBy,
        sortDir,
    })

    const items = yoUrls.items.map(withDefaultHits)
    const totalPages = Math.max(1, Math.ceil(yoUrls.totalItems / pageSize))

    span?.setAttribute('yo.result_count', items.length)
    span?.setAttribute('yo.total_count', yoUrls.totalItems)
    span?.setAttribute('yo.page', page)
    span?.setAttribute('yo.page_size', pageSize)
    span?.setAttribute('yo.search.mode', searchMode)
    span?.setAttribute('yo.search.term_length', searchTerm.length)
    span?.setAttribute('yo.sort.field', sortBy)
    span?.setAttribute('yo.sort.direction', sortDir === -1 ? 'desc' : 'asc')

    return {
        items,
        pagination: {
            page,
            pageSize,
            totalItems: yoUrls.totalItems,
            totalPages,
        },
    }
}

export const getLatestAliases = async ({ span, limit = 10 } = {}) => {
    const items = await findLatestAliases(limit)

    span?.setAttribute('yo.result_count', items.length)

    return items
}

export const getPopularAliases = async ({ span, limit = 10 } = {}) => {
    const items = (await findPopularAliases(limit)).map(withDefaultHits)

    span?.setAttribute('yo.result_count', items.length)

    return items
}

export const getStats = async ({ span } = {}) => {
    const recentThreshold = new Date(
        Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    )
    const stats = await findStatsSummary({ recentThreshold })
    const totalYos = stats.totals.totalYos || 0
    const totalHits = stats.totals.totalHits || 0
    const activeYos = stats.totals.activeYos || 0
    const unusedYos = stats.totals.unusedYos || 0
    const recentlyCreatedYos = stats.totals.recentlyCreatedYos || 0
    const recentlyAccessedYos = stats.totals.recentlyAccessedYos || 0
    const averageHitsPerYo =
        totalYos === 0 ? 0 : Number((totalHits / totalYos).toFixed(1))

    span?.setAttribute('yo.total_count', totalYos)
    span?.setAttribute('yo.total_hits', totalHits)
    span?.setAttribute('yo.active_count', activeYos)
    span?.setAttribute('yo.unused_count', unusedYos)
    span?.setAttribute('yo.recent_created_count', recentlyCreatedYos)
    span?.setAttribute('yo.recent_accessed_count', recentlyAccessedYos)

    return {
        activeYos,
        averageHitsPerYo,
        latestAccessedYo: toIsoDateField(stats.latestAccessedYo, 'lastAccess'),
        newestYo: toIsoDateField(stats.newestYo, 'createdAt'),
        popularYo: totalHits > 0 ? stats.popularYo : null,
        recentlyAccessedYos,
        recentlyCreatedYos,
        recentWindowDays: RECENT_WINDOW_DAYS,
        totalYos,
        totalHits,
        unusedYos,
    }
}

export const resolveAlias = resolveRedirect
