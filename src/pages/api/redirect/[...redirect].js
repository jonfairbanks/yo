import { connectToDatabase } from '../../../lib/mongoose'
import Yo from '../../../models/yo'

import logger from '../../../lib/logger'

export default async function handler(req, res) {
    await connectToDatabase()

    const ip =
        req.headers['x-original-forwarded-for'] ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket
            ? req.connection.socket.remoteAddress
            : 'Unknown')

    logger.info(`Redirect request from IP: ${ip}`)

    const { redirect } = req.query
    const redirectParam = Array.isArray(redirect) ? redirect.join('/') : redirect

    try {
        const item = await Yo.findOneAndUpdate(
            { linkName: redirectParam },
            { $inc: { urlHits: 1 }, $set: { lastAccess: Date.now() } },
            { new: true } // Return the updated document
        )

        if (item) {
            // Ensure we redirect to a fully-qualified URL to avoid nested relative paths
            const destination = item.originalUrl
            let targetUrl = destination

            try {
                targetUrl = new URL(destination).toString()
            } catch {
                const host = req.headers.host
                const protocol =
                    req.headers['x-forwarded-proto'] ||
                    (req.socket?.encrypted ? 'https' : 'http') ||
                    'http'
                const normalizedPath = destination.startsWith('/')
                    ? destination
                    : `/${destination}`
                targetUrl = new URL(
                    normalizedPath,
                    `${protocol}://${host}`
                ).toString()
            }

            // Protect against redirect loops back to the same short link
            try {
                const parsedTarget = new URL(targetUrl)
                const currentHost = (req.headers.host || '').toLowerCase()
                const targetHost = parsedTarget.host.toLowerCase()
                const normalizedTargetPath = parsedTarget.pathname.replace(
                    /\/+$/,
                    ''
                )
                const normalizedSlugPath = `/${redirectParam}`.replace(
                    /\/+/g,
                    '/'
                )
                const normalizedApiPath = `/api/redirect/${redirectParam}`.replace(
                    /\/+/g,
                    '/'
                )

                if (
                    targetHost === currentHost &&
                    (normalizedTargetPath === normalizedSlugPath ||
                        normalizedTargetPath === normalizedApiPath)
                ) {
                    logger.warn(
                        `Prevented self-referential redirect for alias ${redirectParam} -> ${targetUrl}`
                    )
                    res.status(400).json({
                        error: 'Destination points back to this short link.',
                    })
                    return
                }
            } catch (parseError) {
                logger.warn(
                    `Failed to parse destination for alias ${redirectParam}: ${parseError}`
                )
            }

            if (targetUrl.includes('/api/redirect/')) {
                logger.warn(
                    `Prevented redirect loop for alias ${redirectParam} -> ${targetUrl}`
                )
                res.status(400).json({
                    error: 'Destination points back to the redirect handler.',
                })
                return
            }

            logger.info(`User loaded alias ${redirectParam}: ${targetUrl}`)
            res.redirect(targetUrl)
            return
        }

        logger.warn(`Unable to find any entries for: ${redirectParam}`)
        res.status(404).json({
            error: `Unable to find any entries for: ${redirectParam}`,
        })
        return
    } catch (error) {
        logger.error(
            `There was an error while searching database for: ${redirectParam}: ${error}`
        )
        res.status(500).json({ error: `${error}` })
        return
    }
}
