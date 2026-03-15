import { resolveRedirect } from '../../../lib/redirect'
import logger from '../../../lib/logger'
import { withSpan } from '../../../lib/tracing'

export default async function handler(req, res) {
    return withSpan(
        'yo.api.redirect',
        {
            'http.route': '/api/redirect/[...redirect]',
            'http.request.method': req.method,
        },
        async (span) => {
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
            const redirectParam = Array.isArray(redirect)
                ? redirect.join('/')
                : redirect

            span.setAttribute('yo.alias', redirectParam)

            try {
                const result = await resolveRedirect({ redirectParam, req })

                if (result.log) {
                    logger.warn(result.log)
                }

                if (result.status === 302) {
                    span.setAttribute('yo.result', 'redirect')
                    span.setAttribute('http.response.status_code', 302)
                    logger.info(
                        `User loaded alias ${redirectParam}: ${result.targetUrl}`
                    )
                    res.redirect(result.targetUrl)
                    return
                }

                if (result.status === 404) {
                    span.setAttribute('yo.result', 'missing')
                    span.setAttribute('http.response.status_code', 404)
                    logger.warn(result.error)
                    res.status(404).json({ error: result.error })
                    return
                }

                if (result.status === 400) {
                    span.setAttribute('yo.result', 'blocked')
                    span.setAttribute('http.response.status_code', 400)
                    res.status(400).json({ error: result.error })
                    return
                }

                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                res.status(500).json({ error: result.error || 'Unknown error' })
                return
            } catch (error) {
                span.setAttribute('yo.result', 'error')
                span.setAttribute('http.response.status_code', 500)
                logger.error(
                    `There was an error while searching database for: ${redirectParam}: ${error}`
                )
                res.status(500).json({ error: `${error}` })
                return
            }
        }
    )
}
