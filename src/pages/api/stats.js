import { createApiHandler } from '../../lib/api-route'
import { getStats } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load stats.',
        method: 'GET',
        name: 'GET /api/stats',
        requireAuth: true,
        route: '/api/stats',
    },
    async ({ res, span }) => {
        const result = await getStats({ span })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
