import { createApiHandler } from '../../lib/api-route'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

const RECENT_WINDOW_DAYS = 30

const asDate = (value) => {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load stats.',
        method: 'GET',
        name: 'GET /api/stats',
        requireAuth: true,
        route: '/api/stats',
    },
    async ({ res, span }) => {
            await connectToDatabase()

            const hitsData = await withSpan(
                'mongo collect stats',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'find aliases projection(createdAt,lastAccess,linkName,urlHits)',
                },
                () =>
                    Yo.find(
                        {},
                        {
                            createdAt: 1,
                            lastAccess: 1,
                            linkName: 1,
                            urlHits: 1,
                            _id: 0,
                        }
                    ).lean()
            )

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

                if (
                    createdAt &&
                    (!newestYo || createdAt > new Date(newestYo.createdAt))
                ) {
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
                hitsData.length === 0
                    ? 0
                    : Number((hits / hitsData.length).toFixed(1))

            span.setAttribute('yo.total_count', hitsData.length)
            span.setAttribute('yo.total_hits', hits)
            span.setAttribute('yo.active_count', activeYos)
            span.setAttribute('yo.unused_count', unusedYos)
            span.setAttribute('yo.recent_created_count', recentlyCreatedYos)
            span.setAttribute('yo.recent_accessed_count', recentlyAccessedYos)
            span.setAttribute('http.response.status_code', 200)
            return res.status(200).json({
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
            })
    }
)
