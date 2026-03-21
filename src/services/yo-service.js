import logger from '../lib/logger'
import { resolveRedirect } from '../lib/redirect'
import { ApiError } from '../lib/api-error'
import {
    deleteAliasByLinkName,
    findAliases,
    findLatestAliases,
    findPopularAliases,
    findStatsSourceData,
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

const asDate = (value) => {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

const withDefaultHits = (item) => ({
    ...item,
    urlHits: typeof item.urlHits === 'number' ? item.urlHits : 0,
})

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
        logger.info(
            `New Yo alias created: ${normalizedLinkName} -> ${originalUrl}`
        )

        return {
            linkName: item.linkName,
            originalUrl: item.originalUrl,
            shortUrl: item.shortUrl,
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            logger.warn(
                `Could not create a Yo alias as the name is already in-use: ${normalizedLinkName}`
            )
            throw new ApiError(
                409,
                'This name is already in-use. Please select another name.',
                {
                    code: 'already_exists',
                }
            )
        }

        logger.error(
            `Error saving Yo alias:${normalizedLinkName} -> ${originalUrl} to database: ${error}`
        )
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
        logger.warn(
            `User tried updating alias: ${normalizedLinkName}, but it doesn't exist.`
        )
        throw new ApiError(404, `Alias ${normalizedLinkName} not found.`, {
            code: 'missing',
        })
    }

    span?.setAttribute('yo.result', 'updated')
    logger.info(`User updated alias ${normalizedLinkName}: ${originalUrl}`)

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
        logger.warn(`Alias not found: ${normalizedLinkName}`)
        throw new ApiError(404, `Alias ${normalizedLinkName} not found.`, {
            code: 'missing',
        })
    }

    span?.setAttribute('yo.result', 'deleted')
    logger.info(
        `User ${actorNickname || 'unknown'} deleted alias ${item.originalUrl}: ${normalizedLinkName}`
    )

    return {
        message: `${normalizedLinkName} deleted successfully.`,
    }
}

export const listAliases = async ({ query, span }) => {
    const { page, pageSize, searchQuery, sortBy, sortDir } =
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
    const hitsData = await findStatsSourceData()
    const recentThreshold = new Date(
        Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    )

    let hits = 0
    let activeYos = 0
    let unusedYos = 0
    let recentlyCreatedYos = 0
    let recentlyAccessedYos = 0
    let popularYo = null
    let newestYo = null
    let latestAccessedYo = null

    hitsData.forEach((data) => {
        const urlHits =
            typeof data.urlHits === 'number' && data.urlHits > 0
                ? data.urlHits
                : 0
        const createdAt = asDate(data.createdAt)
        const lastAccess = asDate(data.lastAccess)

        hits += urlHits

        if (urlHits > 0) {
            activeYos += 1
        } else {
            unusedYos += 1
        }

        if (createdAt && createdAt >= recentThreshold) {
            recentlyCreatedYos += 1
        }

        if (lastAccess && lastAccess >= recentThreshold) {
            recentlyAccessedYos += 1
        }

        if (!popularYo || urlHits > popularYo.urlHits) {
            popularYo = {
                linkName: data.linkName,
                urlHits,
            }
        }

        if (createdAt && (!newestYo || createdAt > new Date(newestYo.createdAt))) {
            newestYo = {
                createdAt: createdAt.toISOString(),
                linkName: data.linkName,
            }
        }

        if (
            lastAccess &&
            (!latestAccessedYo ||
                lastAccess > new Date(latestAccessedYo.lastAccess))
        ) {
            latestAccessedYo = {
                lastAccess: lastAccess.toISOString(),
                linkName: data.linkName,
            }
        }
    })

    const averageHitsPerYo =
        hitsData.length === 0 ? 0 : Number((hits / hitsData.length).toFixed(1))

    span?.setAttribute('yo.total_count', hitsData.length)
    span?.setAttribute('yo.total_hits', hits)
    span?.setAttribute('yo.active_count', activeYos)
    span?.setAttribute('yo.unused_count', unusedYos)
    span?.setAttribute('yo.recent_created_count', recentlyCreatedYos)
    span?.setAttribute('yo.recent_accessed_count', recentlyAccessedYos)

    return {
        activeYos,
        averageHitsPerYo,
        latestAccessedYo,
        newestYo,
        popularYo: hits > 0 ? popularYo : null,
        recentlyAccessedYos,
        recentlyCreatedYos,
        recentWindowDays: RECENT_WINDOW_DAYS,
        totalYos: hitsData.length,
        totalHits: hits,
        unusedYos,
    }
}

export const resolveAlias = resolveRedirect
