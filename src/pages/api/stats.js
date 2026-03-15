import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'yo.api.stats',
        {
            'http.route': '/api/stats',
            'http.request.method': req.method,
        },
        async (span) => {
            await connectToDatabase()

            const hitsData = await withSpan(
                'mongo.yo.find_stats',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                },
                () =>
                    Yo.find({}, { urlHits: 1, _id: 0 }).sort({
                        urlHits: -1,
                    })
            )

            let hits = 0
            hitsData.forEach((data) => {
                if (data.urlHits) {
                    hits += data.urlHits
                }
            })

            span.setAttribute('yo.total_count', hitsData.length)
            span.setAttribute('yo.total_hits', hits)
            span.setAttribute('http.response.status_code', 200)
            return res.status(200).json({
                totalYos: hitsData.length,
                totalHits: hits,
            })
        }
    )
}
