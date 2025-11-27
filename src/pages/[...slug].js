import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'

import '../app/globals.css'

const CatchAllRoute = () => {
    const router = useRouter()
    const { slug } = router.query
    const hasRedirectedRef = useRef(false)

    useEffect(() => {
        if (!router.isReady || !slug || hasRedirectedRef.current) return

        const slugValue = Array.isArray(slug) ? slug.join('/') : slug
        const normalizedSlug = slugValue.toString().toLowerCase()

        // Avoid redirecting if the path is already the redirect handler
        if (normalizedSlug.startsWith('api/redirect')) return

        hasRedirectedRef.current = true

        const target = `/api/redirect/${slugValue}`

        const timeout = setTimeout(() => {
            if (typeof window !== 'undefined') {
                window.location.replace(target)
            } else {
                router.replace(target)
            }
        }, 1000)

        return () => clearTimeout(timeout)
    }, [router, slug])

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
            <i className="grey-text">Heard you were looking for a link</i>
        </div>
    )
}

export default CatchAllRoute
