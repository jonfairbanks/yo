import Image from 'next/image'
import Head from 'next/head'
import { getRequestMeta } from 'next/dist/server/request-meta'
import { useEffect, useState } from 'react'

import { isReservedPath } from '../lib/reserved-routes'
import { resolveRedirect } from '../lib/redirect'
import { recordRedirectCompletion } from '../lib/redirect-completion'
import { recordSpanError, withSpan } from '../lib/tracing'

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
                    width={64}
                    height={64}
                    priority
                />
                <h1 className="redirect-text">
                    Yo Dawg, That&apos;s a Lot of Requests
                </h1>
                <p>Wait a moment, then try again.</p>
                <button
                    className="btn filled teal white-text darken-2"
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

export const getServerSideProps = async (context) =>
    withSpan(
        'GET /[...slug]',
        {
            'http.route': '/[...slug]',
            'http.request.method': context.req.method || 'GET',
        },
        async (span) => {
            const { slug } = context.params || {}
            const slugValue = Array.isArray(slug) ? slug.join('/') : slug

            if (!slugValue) {
                span.setAttribute('http.response.status_code', 404)
                context.res.statusCode = 404
                return { props: {} }
            }

            const normalizedSlug = slugValue.toString().toLowerCase()
            if (
                normalizedSlug.startsWith('api/redirect') ||
                isReservedPath(normalizedSlug)
            ) {
                span.setAttribute('http.response.status_code', 404)
                context.res.statusCode = 404
                return { props: {} }
            }

            try {
                const result = await resolveRedirect({
                    redirectParam: slugValue,
                    req: context.req,
                })

                if (result.status === 302) {
                    // Next marks validated data requests before passing the original request here.
                    const status = getRequestMeta(context.req, 'isNextDataReq')
                        ? context.res.statusCode || 200
                        : 307
                    recordRedirectCompletion(span, slugValue, status)
                    return {
                        redirect: {
                            destination: result.targetUrl,
                            permanent: false,
                        },
                    }
                }

                if (result.status === 429) {
                    context.res.setHeader(
                        'Retry-After',
                        String(result.retryAfter)
                    )
                    context.res.setHeader('Cache-Control', 'private, no-store')
                    span.setAttribute('http.response.status_code', 429)
                    context.res.statusCode = 429
                    return {
                        props: {
                            rateLimited: true,
                            retryAfter: result.retryAfter,
                        },
                    }
                }
                const status = result.status || 500
                span.setAttribute('http.response.status_code', status)
                if (status >= 500)
                    recordSpanError(
                        span,
                        new Error('Redirect resolution failed')
                    )
                context.res.statusCode = status
                return { props: {} }
            } catch (error) {
                recordSpanError(span, error)
                span.setAttribute('http.response.status_code', 500)
                context.res.statusCode = 500
                return { props: {} }
            }
        }
    )

export default CatchAllRoute
