import { connectToDatabase } from './mongoose'
import Yo from '../models/yo'
import { normalizeLinkName } from './link-name'
import logger from './logger'
import { withSpan } from './tracing'
import { acquireRedirectBudget } from './request-budget'
import { isIP } from 'node:net'

const getClientIp = (req) => {
    let address = req?.socket?.remoteAddress
    const forwarded = req?.headers?.['x-forwarded-for']
    if (forwarded !== undefined) {
        if (typeof forwarded !== 'string' || forwarded.length > 4096)
            return null
        // Public App Runner supplies the source IP through its managed ingress.
        address = forwarded.split(',').at(-1).trim()
    }
    if (typeof address !== 'string') return null
    const version = isIP(address)
    if (version === 4) return address
    if (version !== 6 || address.includes('%')) return null
    const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1)
    const mapped = canonical.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/)
    if (!mapped) return canonical
    const high = parseInt(mapped[1], 16)
    const low = parseInt(mapped[2], 16)
    return [high >> 8, high & 255, low >> 8, low & 255].join('.')
}

const normalizePath = (value) => value.replace(/\/+/g, '/')

const configuredOrigin = () => {
    const url = new URL(process.env.SHORT_BASE_URL || process.env.APP_BASE_URL)
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
    ) {
        throw new Error('Invalid application origin')
    }
    return url.origin
}

const buildTargetUrl = (destination) => {
    try {
        return new URL(destination).toString()
    } catch {
        const origin = configuredOrigin()
        const path = destination.startsWith('/')
            ? destination
            : `/${destination}`
        const target = new URL(path, origin)
        if (target.origin !== origin)
            throw new Error('Invalid relative destination')
        return target.toString()
    }
}

const detectRedirectLoop = ({ targetUrl, redirectParam, req }) => {
    try {
        const parsedTarget = new URL(targetUrl)
        const currentHosts = new Set([(req.headers.host || '').toLowerCase()])
        try {
            currentHosts.add(new URL(configuredOrigin()).host.toLowerCase())
        } catch {
            // Absolute destinations still work without a configured origin.
        }
        const targetHost = parsedTarget.host.toLowerCase()
        // External paths belong to the destination site, not Yo's router.
        if (!currentHosts.has(targetHost)) return null
        const normalizedTargetPath = normalizePath(
            decodeURIComponent(parsedTarget.pathname)
        )
            .replace(/\/+$/, '')
            .toLowerCase()
        const normalizedSlugPath = normalizePath(`/${redirectParam}`).replace(
            /\/+$/,
            ''
        )
        const normalizedApiPath = normalizePath(
            `/api/redirect/${redirectParam}`
        ).replace(/\/+$/, '')

        if (
            normalizedTargetPath === normalizedSlugPath ||
            normalizedTargetPath === normalizedApiPath
        ) {
            return {
                status: 400,
                error: 'Destination points back to this short link.',
            }
        }
        if (
            normalizedTargetPath === '/api/redirect' ||
            normalizedTargetPath.startsWith('/api/redirect/')
        ) {
            return {
                status: 400,
                error: 'Destination points back to the redirect handler.',
            }
        }
    } catch {
        return { status: 400, error: 'Invalid redirect destination.' }
    }

    return null
}

const resolveAdmittedRedirect = async ({ redirectParam, req }) =>
    withSpan('resolve alias', {}, async (span) => {
        const normalizedLinkName = normalizeLinkName(redirectParam)

        if (!normalizedLinkName) {
            logger.warn({
                event: 'redirect_missing',
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
            },
            () =>
                Yo.findOne({ linkName: normalizedLinkName }, { originalUrl: 1 })
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

        let targetUrl
        try {
            targetUrl = buildTargetUrl(item.originalUrl)
        } catch {
            return { status: 400, error: 'Invalid redirect destination.' }
        }
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
        })
        return { status: 302, targetUrl }
    })

export const resolveRedirect = async ({ redirectParam, req }) => {
    if (typeof redirectParam !== 'string' || redirectParam.length > 2048) {
        return { status: 400, error: 'Invalid link name.' }
    }
    const clientIp = getClientIp(req)
    if (!clientIp)
        return { status: 400, error: 'Unable to determine client address.' }
    const release = acquireRedirectBudget(clientIp)
    if (!release) {
        return {
            status: 429,
            error: 'Too many requests. Try again shortly.',
            retryAfter: 1,
        }
    }
    try {
        return await resolveAdmittedRedirect({ redirectParam, req })
    } finally {
        release()
    }
}
