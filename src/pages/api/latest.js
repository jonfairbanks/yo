import { createApiHandler } from '../../lib/api-route'
import { getLatestAliases } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load latest links.',
        method: 'GET',
        name: 'GET /api/latest',
        requireAuth: true,
        route: '/api/latest',
    },
    async ({ res, span }) => {
        const result = await getLatestAliases({ span })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
