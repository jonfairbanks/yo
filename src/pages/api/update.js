import { createApiHandler } from '../../lib/api-route'
import { updateAlias } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to update the short link.',
        method: 'POST',
        name: 'POST /api/update',
        requireAuth: true,
        route: '/api/update',
    },
    async ({ req, res, span }) => {
        const result = await updateAlias({
            linkName: req.body?.linkName,
            originalUrl: req.body?.originalUrl,
            span,
        })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
