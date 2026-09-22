/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
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
