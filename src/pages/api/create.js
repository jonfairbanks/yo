import { createApiHandler } from '../../lib/api-route'
import { createAlias } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to create the short link.',
        method: 'POST',
        name: 'POST /api/create',
        requireAuth: true,
        route: '/api/create',
    },
    async ({ req, res, span }) => {
        const item = await createAlias({
            linkName: req.body?.linkName,
            originalUrl: req.body?.originalUrl,
            shortBaseUrl: process.env.SHORT_BASE_URL,
            span,
        })

        span.setAttribute('http.response.status_code', 201)
        return res.status(201).json(item)
    }
)
