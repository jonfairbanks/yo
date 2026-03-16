import { createApiHandler } from '../../lib/api-route'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load popular links.',
        method: 'GET',
        name: 'GET /api/popular',
        requireAuth: true,
        route: '/api/popular',
    },
    async ({ res, span }) => {
            await connectToDatabase()

            const pop = await withSpan(
                'mongo find popular aliases',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'find aliases sorted by urlHits desc limit 10',
                },
                async () => {
                    const items = await Yo.find(
                        {},
                        {
                            linkName: 1,
                            originalUrl: 1,
                            urlHits: 1,
                            _id: 0,
                        }
                    )
                        .sort({ urlHits: -1 })
                        .limit(10)
                        .lean()

                    return items.map((item) => ({
                        ...item,
                        urlHits:
                            typeof item.urlHits === 'number' ? item.urlHits : 0,
                    }))
                }
            )

            span.setAttribute('yo.result_count', pop.length)
            span.setAttribute('http.response.status_code', 200)
            return res.status(200).json(pop)
    }
)
