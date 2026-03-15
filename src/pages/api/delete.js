import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import logger from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'DELETE /api/delete',
        {
            'http.route': '/api/delete',
            'http.request.method': req.method,
        },
        async (span) => {
            if (req.method !== 'DELETE') {
                span.setAttribute('http.response.status_code', 405)
                return res
                    .status(405)
                    .json({ error: 'Method not allowed. Use DELETE.' })
            }

            const session = await auth0.getSession(req)
            span.setAttribute('enduser.authenticated', Boolean(session))
            if (!session) {
                span.setAttribute('http.response.status_code', 401)
                return res.status(401).json({ error: 'Unauthorized' })
            }

            await connectToDatabase()

            const { linkName } = req.body
            span.setAttribute('yo.alias', linkName)

            if (!linkName) {
                span.setAttribute('http.response.status_code', 400)
                return res.status(400).json({ error: 'No link name provided.' })
            }

            try {
                const user = session.user
                const item = await withSpan(
                    'mongo delete alias',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'findOneAndDelete',
                        'db.collection': 'yo',
                        'db.query.summary': 'delete alias by linkName',
                        'yo.alias': linkName,
                    },
                    () => Yo.findOneAndDelete({ linkName }).lean()
                )

                if (item) {
                    span.setAttribute('yo.result', 'deleted')
                    span.setAttribute('http.response.status_code', 200)
                    logger.info(
                        `User ${user?.nickname || 'unknown'} deleted alias ${item.originalUrl}: ${linkName}`
                    )
                    return res
                        .status(200)
                        .json({ message: `${linkName} deleted successfully.` })
                }

                span.setAttribute('yo.result', 'missing')
                span.setAttribute('http.response.status_code', 404)
                logger.warn(`Alias not found: ${linkName}`)
                return res
                    .status(404)
                    .json({ error: `Alias ${linkName} not found.` })
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.error(
                    `Failed to delete alias: ${linkName} - ${error.message}`
                )
                return res
                    .status(500)
                    .json({ error: `Failed to delete ${linkName}.` })
            }
        }
    )
}
