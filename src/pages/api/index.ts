import type { Span } from '@opentelemetry/api'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../lib/auth0'
import { withSpan } from '../../lib/tracing'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return withSpan(
        'yo.api.index',
        {
            'http.route': '/api',
            'http.request.method': req.method,
        },
        async (span: Span) => {
            const session = await auth0.getSession(req)
            span.setAttribute('enduser.authenticated', Boolean(session))
            if (!session) {
                span.setAttribute('http.response.status_code', 401)
                return res.status(401).json({ error: 'Unauthorized' })
            }

            await connectToDatabase()

            const yoUrls = await withSpan(
                'mongo.yo.find_all',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                },
                () => Yo.find().sort({ linkName: 1 })
            )

            span.setAttribute('yo.result_count', yoUrls.length)
            span.setAttribute('http.response.status_code', 200)
            res.status(200).json(yoUrls)
        }
    )
}
