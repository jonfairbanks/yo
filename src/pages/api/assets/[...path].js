import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
    const { path: filePath } = req.query
    const fileFullPath = path.join(process.cwd(), 'static-assets', ...filePath)

    try {
        const file = fs.readFileSync(fileFullPath)
        res.setHeader('Content-Type', 'image/png') // or the appropriate MIME type
        res.send(file)
    } catch (error) {
        res.status(404).send('File not found')
    }
}
