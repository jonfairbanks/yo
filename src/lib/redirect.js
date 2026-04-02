import { connectToDatabase } from './mongoose'
import Yo from '../models/yo'
import { normalizeLinkName } from './link-name'
import logger from './logger'
import { withSpan } from './tracing'

const normalizePath = (value) => value.replace(/\/+/g, '/')

const buildTargetUrl = (destination, req) => {
    try {
        return new URL(destination).toString()
    } catch {
        const host = req.headers.host
        const protocol =
            req.headers['x-forwarded-proto'] ||
            (req.socket?.encrypted ? 'https' : 'http') ||
            'http'
        const normalizedPath = destination.startsWith('/')
            ? destination
            : `/${destination}`
        return new URL(normalizedPath, `${protocol}://${host}`).toString()
    }
}

const detectRedirectLoop = ({ targetUrl, redirectParam, req }) => {
    try {
        const parsedTarget = new URL(targetUrl)
        const currentHost = (req.headers.host || '').toLowerCase()
        const targetHost = parsedTarget.host.toLowerCase()
        const normalizedTargetPath = normalizePath(
            parsedTarget.pathname
        ).replace(/\/+$/, '')
        const normalizedSlugPath = normalizePath(`/${redirectParam}`).replace(
            /\/+$/,
            ''
        )
        const normalizedApiPath = normalizePath(
            `/api/redirect/${redirectParam}`
        ).replace(/\/+$/, '')

        if (
            targetHost === currentHost &&
            (normalizedTargetPath === normalizedSlugPath ||
                normalizedTargetPath === normalizedApiPath)
        ) {
            return {
                status: 400,
                error: 'Destination points back to this short link.',
                log: `Prevented self-referential redirect for alias ${redirectParam} -> ${targetUrl}`,
            }
        }
    } catch (parseError) {
        logger.warn(
            `Failed to parse destination for alias ${redirectParam}: ${parseError}`
        )
    }

    if (targetUrl.includes('/api/redirect/')) {
        return {
            status: 400,
            error: 'Destination points back to the redirect handler.',
            log: `Prevented redirect loop for alias ${redirectParam} -> ${targetUrl}`,
        }
    }

    return null
}

export const resolveRedirect = async ({ redirectParam, req }) =>
    withSpan(
        'resolve alias',
        {
            'yo.alias': normalizeLinkName(redirectParam) || 'unknown',
        },
        async (span) => {
            const normalizedLinkName = normalizeLinkName(redirectParam)

            if (!normalizedLinkName) {
                logger.warn({
                    event: 'redirect_missing',
                    alias: String(redirectParam || ''),
                    status: 404,
                })
                span.setAttribute('yo.result', 'missing')
                return {
                    status: 404,
                    error: `Unable to find any entries for: ${redirectParam}`,
                }
            }

            await connectToDatabase()

            const item = await withSpan(
                'mongo find alias',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'findOne',
                    'db.collection': 'yo',
                    'db.query.summary': 'find alias by linkName',
                    'yo.alias': normalizedLinkName,
                },
                () => Yo.findOne({ linkName: normalizedLinkName }, { originalUrl: 1 })
            )

            if (!item) {
                logger.warn({
                    event: 'redirect_missing',
                    alias: normalizedLinkName,
                    status: 404,
                })
                span.setAttribute('yo.result', 'missing')
                return {
                    status: 404,
                    error: `Unable to find any entries for: ${redirectParam}`,
                }
            }

            const targetUrl = buildTargetUrl(item.originalUrl, req)
            const loop = detectRedirectLoop({
                targetUrl,
                redirectParam: normalizedLinkName,
                req,
            })
            if (loop) {
                logger.warn({
                    event: 'redirect_blocked',
                    alias: normalizedLinkName,
                    reason: loop.error,
                    status: loop.status,
                    targetUrl,
                })
                span.setAttribute('yo.result', 'blocked_loop')
                span.setAttribute('http.response.status_code', loop.status)
                return loop
            }

            await withSpan(
                'mongo record redirect hit',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'updateOne',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'increment urlHits and set lastAccess for resolved alias',
                    'yo.alias': normalizedLinkName,
                },
                () =>
                    Yo.updateOne(
                        { _id: item._id },
                        {
                            $inc: { urlHits: 1 },
                            $set: { lastAccess: Date.now() },
                        }
                    )
            )

            span.setAttribute('yo.result', 'redirect')
            span.setAttribute('http.response.status_code', 302)
            logger.info({
                event: 'redirect_success',
                alias: normalizedLinkName,
                status: 302,
                targetUrl,
            })
            return { status: 302, targetUrl }
        }
    )
