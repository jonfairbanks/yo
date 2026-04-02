import { createApiHandler } from '../../lib/api-route'
import { getPopularAliases } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load popular links.',
        method: 'GET',
        name: 'GET /api/popular',
        requireAuth: true,
        route: '/api/popular',
    },
    async ({ res, span }) => {
        const result = await getPopularAliases({ span })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
