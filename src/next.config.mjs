import { execFileSync } from 'node:child_process'

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    async generateBuildId() {
        const revision =
            process.env.YO_BUILD_REVISION ||
            process.env.GITHUB_SHA ||
            process.env.VERCEL_GIT_COMMIT_SHA
        if (revision && /^[a-f0-9]{40}$/i.test(revision)) return revision
        try {
            const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }).trim()
            if (/^[a-f0-9]{40}$/i.test(commit)) return commit
        } catch {
            // Next generates a build ID when the source checkout has no Git metadata.
        }
        return null
    },
    transpilePackages: [
        '@tanstack/react-store',
        '@tanstack/react-table',
        '@tanstack/store',
        '@tanstack/table-core',
    ],
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'none'",
                    },
                    { key: 'X-Frame-Options', value: 'DENY' },
                ],
            },
        ]
    },
}

export default nextConfig
