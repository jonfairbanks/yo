import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'GET /api/popular',
        {
            'http.route': '/api/popular',
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

            const pop = await withSpan(
                'mongo find popular aliases',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'find aliases sorted by urlHits desc limit 10',
                },
                () => Yo.find({}).sort({ urlHits: -1 }).limit(10)
            )

            span.setAttribute('yo.result_count', pop.length)
            span.setAttribute('http.response.status_code', 200)
            res.status(200).json(pop)
        }
    )
}
