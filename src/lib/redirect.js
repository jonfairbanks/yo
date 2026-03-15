import { connectToDatabase } from './mongoose'
import Yo from '../models/yo'
import logger from './logger'

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
        const normalizedTargetPath = normalizePath(parsedTarget.pathname).replace(
            /\/+$/,
            ''
        )
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

export const resolveRedirect = async ({ redirectParam, req }) => {
    await connectToDatabase()

    const item = await Yo.findOneAndUpdate(
        { linkName: redirectParam },
        { $inc: { urlHits: 1 }, $set: { lastAccess: Date.now() } },
        { new: true }
    )

    if (!item) {
        return {
            status: 404,
            error: `Unable to find any entries for: ${redirectParam}`,
        }
    }

    const targetUrl = buildTargetUrl(item.originalUrl, req)
    const loop = detectRedirectLoop({ targetUrl, redirectParam, req })
    if (loop) {
        return loop
    }

    return { status: 302, targetUrl }
}
