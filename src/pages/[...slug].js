import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'

import '../app/globals.css'

const CatchAllRoute = () => {
    const router = useRouter()
    const { slug } = router.query

    useEffect(() => {
        // Make sure the slug is defined before redirecting
        if (slug) {
            const slugValue = Array.isArray(slug) ? slug.join('/') : slug
            router.push(`/api/redirect/${slugValue}`)
        }
    }, [slug, router])

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
