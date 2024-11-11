// Note:
//
// Since we want to redirect to sites based on the path, we have overriden Next.js' built-in public directory behavior
//
// This file restores that functionality by calling /api/public/filename.ext. Files are served from src/public.
//
// Use-cases: favicon.ico, manifest.json, robots.txt, etc.

import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
    const { path: filePath } = req.query
    const fileFullPath = path.join(process.cwd(), 'public', ...filePath)

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
