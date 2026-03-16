import { createApiHandler } from '../../lib/api-route'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load latest links.',
        method: 'GET',
        name: 'GET /api/latest',
        requireAuth: true,
        route: '/api/latest',
    },
    async ({ res, span }) => {
            await connectToDatabase()

            const rec = await withSpan(
                'mongo find latest aliases',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'find aliases sorted by lastAccess desc limit 10',
                },
                () =>
                    Yo.find(
                        {},
                        {
                            linkName: 1,
                            originalUrl: 1,
                            lastAccess: 1,
                            _id: 0,
                        }
                    )
                        .sort({ lastAccess: -1 })
                        .limit(10)
                        .lean()
            )

            span.setAttribute('yo.result_count', rec.length)
            span.setAttribute('http.response.status_code', 200)
            return res.status(200).json(rec)
    }
)
