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

        // Determine the MIME type based on the file extension
        const ext = path.extname(fileFullPath).toLowerCase()
        let contentType

        switch (ext) {
            case '.png':
                contentType = 'image/png'
                break
            case '.txt':
                contentType = 'text/plain'
                break
            case '.json':
                contentType = 'application/json'
                break
            default:
                contentType = 'application/octet-stream' // Default for unknown types
        }

        res.setHeader('Content-Type', contentType)
        res.send(file)
    } catch (err) {
        logger.error(`File ${fileFullPath} not found: ${err}`)
        res.status(404).send('File not found')
    }
}
