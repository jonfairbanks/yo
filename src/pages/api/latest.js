import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'GET /api/latest',
        {
            'http.route': '/api/latest',
            'http.request.method': req.method,
        },
        async (span) => {
            const session = await auth0.getSession(req)
            span.setAttribute('enduser.authenticated', Boolean(session))
            if (!session) {
                span.setAttribute('http.response.status_code', 401)
                return res.status(401).json({ error: 'Unauthorized' })
            }

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
}
