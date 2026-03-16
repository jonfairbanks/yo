import validUrl from 'valid-url'

import { jsonError } from '../../lib/api-route'
import { auth0 } from '../../lib/auth0'
import { normalizeLinkName } from '../../lib/link-name'
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
            const normalizedLinkName = normalizeLinkName(linkName)
            span.setAttribute('yo.alias', normalizedLinkName || 'unknown')

            if (!normalizedLinkName) {
                span.setAttribute('yo.result', 'invalid_alias')
                span.setAttribute('http.response.status_code', 400)
                return res.status(400).json({
                    error: 'A link name is required.',
                })
            }

            const reservedPath = getReservedPathMatch(normalizedLinkName)
            if (reservedPath) {
                span.setAttribute('yo.result', 'reserved_alias')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `Blocked update for reserved alias path: ${normalizedLinkName} (matched: ${reservedPath})`
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
                return jsonError(
                    res,
                    400,
                    'The provided URL is improperly formatted.'
                )
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
                        'yo.alias': normalizedLinkName,
                    },
                    () =>
                        Yo.findOneAndUpdate(
                            { linkName: normalizedLinkName },
                            { $set: { originalUrl } },
                            { new: true }
                        )
                )

                if (item) {
                    span.setAttribute('yo.result', 'updated')
                    span.setAttribute('http.response.status_code', 200)
                    logger.info(
                        `User updated alias ${normalizedLinkName}: ${originalUrl}`
                    )
                    return res.status(200).json({
                        message: `${normalizedLinkName} updated successfully.`,
                    })
                }

                span.setAttribute('yo.result', 'missing')
                span.setAttribute('http.response.status_code', 404)
                logger.warn(
                    `User tried updating alias: ${normalizedLinkName}, but it doesn't exist.`
                )
                return jsonError(
                    res,
                    404,
                    `Alias ${normalizedLinkName} not found.`
                )
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.warn(
                    `There was an error while updating alias: ${normalizedLinkName}: ${error}`
                )
                return jsonError(
                    res,
                    500,
                    `Failed to update ${normalizedLinkName}.`
                )
            }
        }
    )
}
