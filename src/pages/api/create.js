import validUrl from 'valid-url'

import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import { getReservedPathMatch } from '../../lib/reserved-routes'
import Yo from '../../models/yo'

import logger from '../../lib/logger'
import { withSpan } from '../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'yo.api.create',
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

            const { originalUrl, linkName, updatedAt } = req.body
            span.setAttribute('yo.alias', linkName)

            const reservedPath = getReservedPathMatch(linkName)
            if (reservedPath) {
                span.setAttribute('yo.result', 'reserved_alias')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `Blocked creation for reserved alias path: ${linkName} (matched: ${reservedPath})`
                )
                return res.status(400).json({
                    error: 'This link name is reserved by the application.',
                })
            }

            if (!validUrl.isUri(originalUrl)) {
                span.setAttribute('yo.result', 'invalid_url')
                span.setAttribute('http.response.status_code', 500)
                logger.error(
                    `The provided URL for ${linkName} is improperly formatted: ${originalUrl}`
                )
                return res
                    .status(500)
                    .json({
                        error: 'The provided URL is improperly formatted.',
                    })
            }

            try {
                const urlData = await withSpan(
                    'mongo.yo.findOne_existing_alias',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'findOne',
                        'db.collection': 'yo',
                        'yo.alias': linkName,
                    },
                    () => Yo.findOne({ linkName: { $eq: linkName } })
                )

                if (urlData) {
                    span.setAttribute('yo.result', 'already_exists')
                    span.setAttribute('http.response.status_code', 409)
                    logger.warn(
                        `Could not create a Yo alias as the name is already in-use: ${linkName}`
                    )
                    return res.status(409).json({
                        error: 'This name is already in-use. Please select another name.',
                    })
                }

                const shortUrl = `${process.env.SHORT_BASE_URL}/${linkName}`
                const itemToBeSaved = {
                    originalUrl,
                    shortUrl,
                    linkName,
                    updatedAt,
                }

                const item = new Yo(itemToBeSaved)
                await withSpan(
                    'mongo.yo.save',
                    {
                        'db.system': 'mongodb',
                        'db.operation': 'save',
                        'db.collection': 'yo',
                        'yo.alias': linkName,
                    },
                    () => item.save()
                )

                span.setAttribute('yo.result', 'created')
                span.setAttribute('http.response.status_code', 201)
                logger.info(
                    `New Yo alias created: ${linkName} -> ${originalUrl}`
                )

                return res.status(201).json(itemToBeSaved)
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.error(
                    `Error saving Yo alias:${linkName} -> ${originalUrl} to database: ${error}`
                )
                return res.status(500).json({
                    originalUrl,
                    shortUrl: process.env.SHORT_BASE_URL,
                    linkName,
                    updatedAt,
                    status: 'Failed',
                })
            }
        }
    )
}
