import { createApiHandler, jsonError } from '../../../lib/api-route'
import logger from '../../../lib/logger'
import { resolveAlias } from '../../../services/yo-service'
export default createApiHandler(
    {
        internalErrorMessage: 'Failed to resolve redirect.',
        method: 'GET',
        name: 'GET /api/redirect/[...redirect]',
        route: '/api/redirect/[...redirect]',
    },
    async ({ req, res, span }) => {
            const { redirect } = req.query
            const redirectParam = Array.isArray(redirect)
                ? redirect.join('/')
                : redirect

            span.setAttribute('yo.alias', redirectParam)

            const result = await resolveAlias({ redirectParam, req })

            if (result.log) {
                logger.warn(result.log)
            }

            if (result.status === 302) {
                span.setAttribute('yo.result', 'redirect')
                span.setAttribute('http.response.status_code', 302)
                return res.redirect(result.targetUrl)
            }

            if (result.status === 404) {
                span.setAttribute('yo.result', 'missing')
                span.setAttribute('http.response.status_code', 404)
                return jsonError(res, 404, result.error)
            }

            if (result.status === 400) {
                span.setAttribute('yo.result', 'blocked')
                span.setAttribute('http.response.status_code', 400)
                return jsonError(res, 400, result.error)
            }

            span.setAttribute('yo.result', 'error')
            span.setAttribute('http.response.status_code', 500)
            return jsonError(
                res,
                500,
                result.error || 'Unknown redirect error.'
            )
        }
)
