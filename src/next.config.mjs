/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
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
