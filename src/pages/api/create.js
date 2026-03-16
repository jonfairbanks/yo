import validUrl from 'valid-url'

import { auth0 } from '../../lib/auth0'
import { normalizeLinkName } from '../../lib/link-name'
import { connectToDatabase } from '../../lib/mongoose'
import { getReservedPathMatch } from '../../lib/reserved-routes'
import Yo from '../../models/yo'

import logger from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'POST /api/create',
        {
            'http.route': '/api/create',
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
                    `Blocked creation for reserved alias path: ${normalizedLinkName} (matched: ${reservedPath})`
                )
                return res.status(400).json({
                    error: 'This link name is reserved by the application.',
                })
            }

            if (!validUrl.isUri(originalUrl)) {
                span.setAttribute('yo.result', 'invalid_url')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `The provided URL for ${normalizedLinkName} is improperly formatted: ${originalUrl}`
                )
                return res.status(400).json({
                    error: 'The provided URL is improperly formatted.',
                })
            }

            try {
                const urlData = await withSpan(
                    'mongo check alias availability',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'findOne',
                        'db.collection': 'yo',
                        'db.query.summary': 'find alias by linkName',
                        'yo.alias': normalizedLinkName,
                    },
                    () => Yo.findOne({ linkName: { $eq: normalizedLinkName } })
                )

                if (urlData) {
                    span.setAttribute('yo.result', 'already_exists')
                    span.setAttribute('http.response.status_code', 409)
                    logger.warn(
                        `Could not create a Yo alias as the name is already in-use: ${normalizedLinkName}`
                    )
                    return res.status(409).json({
                        error: 'This name is already in-use. Please select another name.',
                    })
                }

                const shortUrl = `${process.env.SHORT_BASE_URL}/${normalizedLinkName}`
                const itemToBeSaved = {
                    originalUrl,
                    shortUrl,
                    linkName: normalizedLinkName,
                }

                const item = new Yo(itemToBeSaved)
                await withSpan(
                    'mongo create alias',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'save',
                        'db.collection': 'yo',
                        'db.query.summary': 'insert alias document',
                        'yo.alias': normalizedLinkName,
                    },
                    () => item.save()
                )

                span.setAttribute('yo.result', 'created')
                span.setAttribute('http.response.status_code', 201)
                logger.info(
                    `New Yo alias created: ${normalizedLinkName} -> ${originalUrl}`
                )

                return res.status(201).json({
                    linkName: item.linkName,
                    originalUrl: item.originalUrl,
                    shortUrl: item.shortUrl,
                })
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.error(
                    `Error saving Yo alias:${normalizedLinkName} -> ${originalUrl} to database: ${error}`
                )
                return res.status(500).json({
                    error: 'Failed to create the short link.',
                })
            }
        }
    )
}
