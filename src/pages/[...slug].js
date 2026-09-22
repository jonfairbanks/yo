import Image from 'next/image'
import Head from 'next/head'
import { useEffect, useState } from 'react'

import { isReservedPath } from '../lib/reserved-routes'
import { resolveRedirect } from '../lib/redirect'

const CatchAllRoute = ({ rateLimited = false, retryAfter = 1 }) => {
    const [canRetry, setCanRetry] = useState(false)
    useEffect(() => {
        if (!rateLimited) return
        setCanRetry(false)
        const timer = setTimeout(() => setCanRetry(true), retryAfter * 1000)
        return () => clearTimeout(timer)
    }, [rateLimited, retryAfter])

    if (rateLimited) {
        return (
            <main className="centered rate-limit-page">
                <Head>
                    <title>Too Many Requests | Yo</title>
                </Head>
                <Image
                    src="/images/apple-touch-icon.png"
                    alt="Yo URL"
                    width={100}
                    height={100}
                    priority
                />
                <h1 className="redirect-text">Too Many Requests</h1>
                <p>
                    Too many requests from your IP address. Wait a moment, then
                    try again.
                </p>
                <button
                    className="btn"
                    disabled={!canRetry}
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </main>
        )
    }
    return (
        <div className="centered">
            <Image
                src="/images/apple-touch-icon.png"
                alt="Yo URL"
                width={100}
                height={100}
                priority
            />
            <b className="redirect-text teal-text">Yo Dawg...</b>
            <i className="grey-text">That link doesn&apos;t exist!</i>
        </div>
    )
}

export const getServerSideProps = async (context) => {
    const { slug } = context.params || {}
    const slugValue = Array.isArray(slug) ? slug.join('/') : slug

    if (!slugValue) {
        context.res.statusCode = 404
        return { props: {} }
    }

    const normalizedSlug = slugValue.toString().toLowerCase()
    if (
        normalizedSlug.startsWith('api/redirect') ||
        isReservedPath(normalizedSlug)
    ) {
        context.res.statusCode = 404
        return { props: {} }
    }

    try {
        const result = await resolveRedirect({
            redirectParam: slugValue,
            req: context.req,
        })

        if (result.status === 302) {
            return {
                redirect: {
                    destination: result.targetUrl,
                    permanent: false,
                },
            }
        }

        if (result.status === 429) {
            context.res.setHeader('Retry-After', String(result.retryAfter))
            context.res.setHeader('Cache-Control', 'private, no-store')
            context.res.statusCode = 429
            return {
                props: { rateLimited: true, retryAfter: result.retryAfter },
            }
        }
        context.res.statusCode = result.status || 500
        return { props: {} }
    } catch {
        context.res.statusCode = 500
        return { props: {} }
    }
}

export default CatchAllRoute
