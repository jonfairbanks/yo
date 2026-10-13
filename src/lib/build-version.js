import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const readBuildVersion = () => {
    try {
        const version = readFileSync(
            join(process.cwd(), '.next', 'BUILD_ID'),
            'utf8'
        ).trim()
        if (/^[a-zA-Z0-9_-]{1,128}$/.test(version)) return version
    } catch {
        // Development runs do not have a built artifact.
    }
    return process.env.NODE_ENV === 'production' ? 'unknown' : 'development'
}
