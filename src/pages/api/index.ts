import type { Span } from '@opentelemetry/api'
import { createApiHandler } from '../../lib/api-route'
import { NextApiRequest, NextApiResponse } from 'next'
import { listAliases } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to load links.',
        method: 'GET',
        name: 'GET /api',
        requireAuth: true,
        route: '/api',
    },
    async ({
        req,
        res,
        span,
    }: {
        req: NextApiRequest
        res: NextApiResponse
        span: Span
    }) => {
        const result = await listAliases({ query: req.query, span })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
