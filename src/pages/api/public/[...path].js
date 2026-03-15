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
    if (req.method !== 'GET') {
        return res.status(405).send('Method not allowed')
    }

    const { path: filePath } = req.query
    const pathSegments = Array.isArray(filePath) ? filePath : [filePath]
    const publicDir = path.resolve(process.cwd(), 'public')
    const fileFullPath = path.resolve(publicDir, ...pathSegments)

    // Ensure the resolved path stays inside the public directory.
    const relativePath = path.relative(publicDir, fileFullPath)
    if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath) ||
        pathSegments.some(
            (segment) => typeof segment !== 'string' || segment.includes('\0')
        )
    ) {
        logger.warn(`Invalid public file path requested: ${String(filePath)}`)
        return res.status(400).send('Invalid file path')
    }

    try {
        const file = fs.readFileSync(fileFullPath)
        const ext = path.extname(fileFullPath).toLowerCase()
        const contentType =
            CONTENT_TYPES[ext] || 'application/octet-stream'

        res.setHeader('Content-Type', contentType)
        res.send(file)
    } catch (err) {
        logger.error(`File ${fileFullPath} not found: ${err}`)
        res.status(404).send('File not found')
    }
}
