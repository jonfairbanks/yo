import { auth0 } from './auth0'
import { isApiError } from './api-error'
import logger from './logger'
import { withSpan } from './tracing'

export const jsonError = (res, statusCode, error) =>
    res.status(statusCode).json({ error })

const defaultErrorMessage = (route) =>
    `Unexpected error while handling ${route}.`

const safeLog = (level, payload) => {
    try {
        logger[level]?.(payload)
    } catch {
        return
    }
}

export const createApiHandler =
    (
        {
            method,
            name,
            route,
            requireAuth = false,
            methodNotAllowedMessage = 'Method not allowed',
            internalErrorMessage,
            onError = null,
        },
        callback
    ) =>
    async (req, res) =>
        withSpan(
            name,
            {
                'http.route': route,
                'http.request.method': req.method,
            },
            async (span) => {
                if (req.method !== method) {
                    safeLog('warn', {
                        event: 'request_method_not_allowed',
                        method: req.method,
                        route,
                        status: 405,
                    })
                    span.setAttribute('http.response.status_code', 405)
                    return jsonError(res, 405, methodNotAllowedMessage)
                }

                let session = null
                try {
                    if (requireAuth) {
                        session = await auth0.getSession(req)
                        span.setAttribute(
                            'enduser.authenticated',
                            Boolean(session)
                        )

                        if (!session) {
                            safeLog('warn', {
                                event: 'auth_failure',
                                route,
                                status: 401,
                            })
                            span.setAttribute('http.response.status_code', 401)
                            return jsonError(res, 401, 'Unauthorized')
                        }
                    }

                    return await callback({ req, res, session, span })
                } catch (error) {
                    if (isApiError(error)) {
                        span.setAttribute(
                            'yo.result',
                            error.code || 'request_error'
                        )
                        span.setAttribute(
                            'http.response.status_code',
                            error.statusCode
                        )
                        return jsonError(res, error.statusCode, error.message)
                    }

                    span.setAttribute('yo.result', 'error')
                    span.setAttribute('http.response.status_code', 500)

                    if (typeof onError === 'function') {
                        onError(error, { req, route, session, span })
                    } else {
                        safeLog('error', {
                            event: 'request_failed',
                            route,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                            status: 500,
                        })
                    }

                    return jsonError(
                        res,
                        500,
                        internalErrorMessage || defaultErrorMessage(route)
                    )
                }
            }
        )
