import { resolveRedirect } from '../../../lib/redirect'
import logger from '../../../lib/logger'

export default async function handler(req, res) {
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
        const result = await resolveRedirect({ redirectParam, req })

        if (result.log) {
            logger.warn(result.log)
        }

        if (result.status === 302) {
            logger.info(`User loaded alias ${redirectParam}: ${result.targetUrl}`)
            res.redirect(result.targetUrl)
            return
        }

        if (result.status === 404) {
            logger.warn(result.error)
            res.status(404).json({ error: result.error })
            return
        }

        if (result.status === 400) {
            res.status(400).json({ error: result.error })
            return
        }

        res.status(500).json({ error: result.error || 'Unknown error' })
        return
    } catch (error) {
        logger.error(
            `There was an error while searching database for: ${redirectParam}: ${error}`
        )
        res.status(500).json({ error: `${error}` })
        return
    }
}
