import Image from 'next/image'

import { isReservedPath } from '../lib/reserved-routes'
import { resolveRedirect } from '../lib/redirect'

const CatchAllRoute = () => {
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

        context.res.statusCode = result.status || 500
        return { props: {} }
    } catch {
        context.res.statusCode = 500
        return { props: {} }
    }
}

export default CatchAllRoute
