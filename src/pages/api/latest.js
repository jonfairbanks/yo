import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'yo.api.latest',
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
                'mongo.yo.find_latest',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                },
                () => Yo.find({}).sort({ lastAccess: -1 }).limit(10)
            )

            span.setAttribute('yo.result_count', rec.length)
            span.setAttribute('http.response.status_code', 200)
            return res.status(200).json(rec)
        }
    )
}
