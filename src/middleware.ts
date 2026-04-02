import type { NextRequest } from 'next/server'

import { auth0 } from './lib/auth0'

export async function middleware(request: NextRequest) {
    return await auth0.middleware(request)
}

export const config = {
    runtime: 'nodejs',
    matcher: [
        '/((?!_next/static|_next/image|api/|favicon.ico|manifest.json|browserconfig.xml|sitemap.xml|robots.txt|images/|vendor/).*)',
    ],
}
