// Note:
//
// Since we want to redirect to sites based on the path, we have overriden Next.js' built-in public directory behavior
//
// This file restores that functionality by calling /api/public/filename.ext. Files are served from src/public.
//
// Use-cases: favicon.ico, manifest.json, robots.txt, etc.

import fs from 'fs'
import path from 'path'
import logger from '../../../lib/logger'
import { withSpan } from '../../../lib/tracing'

const CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
}

export default function handler(req, res) {
    return withSpan(
        'yo.api.public_asset',
        {
            'http.route': '/api/public/[...path]',
            'http.request.method': req.method,
        },
        async (span) => {
            if (req.method !== 'GET') {
                span.setAttribute('http.response.status_code', 405)
                return res.status(405).send('Method not allowed')
            }

            const { path: filePath } = req.query
            const pathSegments = Array.isArray(filePath) ? filePath : [filePath]
            const publicDir = path.resolve(process.cwd(), 'public')
            const fileFullPath = path.resolve(publicDir, ...pathSegments)

            const relativePath = path.relative(publicDir, fileFullPath)
            if (
                relativePath.startsWith('..') ||
                path.isAbsolute(relativePath) ||
                pathSegments.some(
                    (segment) =>
                        typeof segment !== 'string' || segment.includes('\0')
                )
            ) {
                span.setAttribute('yo.result', 'invalid_public_path')
                span.setAttribute('http.response.status_code', 400)
                logger.warn(
                    `Invalid public file path requested: ${String(filePath)}`
                )
                return res.status(400).send('Invalid file path')
            }

            try {
                const file = fs.readFileSync(fileFullPath)
                const ext = path.extname(fileFullPath).toLowerCase()
                const contentType =
                    CONTENT_TYPES[ext] || 'application/octet-stream'

                span.setAttribute('yo.asset.extension', ext || 'unknown')
                span.setAttribute('http.response.status_code', 200)
                res.setHeader('Content-Type', contentType)
                res.send(file)
            } catch (err) {
                span.setAttribute('yo.result', 'missing_public_asset')
                span.setAttribute('http.response.status_code', 404)
                logger.error(`File ${fileFullPath} not found: ${err}`)
                res.status(404).send('File not found')
            }
        }
    )
}
