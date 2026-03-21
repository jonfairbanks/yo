import { createApiHandler } from '../../lib/api-route'
import { deleteAlias } from '../../services/yo-service'

export default createApiHandler(
    {
        internalErrorMessage: 'Failed to delete the short link.',
        method: 'DELETE',
        methodNotAllowedMessage: 'Method not allowed. Use DELETE.',
        name: 'DELETE /api/delete',
        requireAuth: true,
        route: '/api/delete',
    },
    async ({ req, res, session, span }) => {
        const result = await deleteAlias({
            actorNickname: session?.user?.nickname,
            linkName: req.body?.linkName,
            span,
        })

        span.setAttribute('http.response.status_code', 200)
        return res.status(200).json(result)
    }
)
