import { createApiHandler, jsonError } from '../../../lib/api-route'
import { recordRedirectCompletion } from '../../../lib/redirect-completion'
import { recordSpanError } from '../../../lib/tracing'
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

        const result = await resolveAlias({ redirectParam, req })

        if (result.status === 429) {
            res.setHeader('Cache-Control', 'private, no-store')
            res.setHeader('Retry-After', String(result.retryAfter))
            span.setAttribute('http.response.status_code', 429)
            return jsonError(res, 429, result.error)
        }

        if (result.status === 302) {
            const response = res.redirect(result.targetUrl)
            recordRedirectCompletion(span, redirectParam, 302)
            return response
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

        recordSpanError(span, new Error('Redirect resolution failed'))
        span.setAttribute('yo.result', 'error')
        span.setAttribute('http.response.status_code', 500)
        return jsonError(res, 500, result.error || 'Unknown redirect error.')
    }
)
