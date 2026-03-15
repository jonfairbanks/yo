import validUrl from 'valid-url'

import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import { getReservedPathMatch } from '../../lib/reserved-routes'
import Yo from '../../models/yo'

import logger from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'POST /api/update',
        {
            'http.route': '/api/update',
            'http.request.method': req.method,
        },
        async (span) => {
            if (req.method !== 'POST') {
                span.setAttribute('http.response.status_code', 405)
                return res.status(405).json({ error: 'Method not allowed' })
            }

            const session = await auth0.getSession(req)
            span.setAttribute('enduser.authenticated', Boolean(session))
            if (!session) {
                span.setAttribute('http.response.status_code', 401)
                return res.status(401).json({ error: 'Unauthorized' })
            }

            await connectToDatabase()

            const { originalUrl, linkName } = req.body
            span.setAttribute('yo.alias', linkName)

            const reservedPath = getReservedPathMatch(linkName)
            if (reservedPath) {
                span.setAttribute('yo.result', 'reserved_alias')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `Blocked update for reserved alias path: ${linkName} (matched: ${reservedPath})`
                )
                return res.status(400).json({
                    error: 'This link name is reserved by the application.',
                })
            }

            if (!validUrl.isUri(originalUrl)) {
                span.setAttribute('yo.result', 'invalid_url')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `The provided URL is improperly formatted: ${originalUrl}`
                )
                return res
                    .status(400)
                    .json('The provided URL is improperly formatted.')
            }

            try {
                const item = await withSpan(
                    'mongo update alias',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'findOneAndUpdate',
                        'db.collection': 'yo',
                        'db.query.summary':
                            'find alias by linkName and update originalUrl, updatedAt',
                        'yo.alias': linkName,
                    },
                    () =>
                        Yo.findOneAndUpdate(
                            { linkName },
                            { $set: { originalUrl, updatedAt: new Date() } },
                            { new: true }
                        )
                )

                if (item) {
                    span.setAttribute('yo.result', 'updated')
                    span.setAttribute('http.response.status_code', 200)
                    logger.info(
                        `User updated alias ${linkName}: ${originalUrl}`
                    )
                    return res
                        .status(200)
                        .json(`${linkName} updated successfully.`)
                }

                span.setAttribute('yo.result', 'missing')
                span.setAttribute('http.response.status_code', 500)
                logger.warn(
                    `User tried updating alias: ${linkName}, but it doesn't exist.`
                )
                return res
                    .status(500)
                    .json('There was an error while trying to update that Yo')
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.warn(
                    `There was an error while updating alias: ${linkName}: ${error}`
                )
                return res
                    .status(500)
                    .json('There was an error while updating that Yo')
            }
        }
    )
}
