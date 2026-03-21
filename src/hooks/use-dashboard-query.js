import { useEffect, useRef, useState } from 'react'

import { useDashboard } from '../context/dashboard-context'

const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        return response.json()
    }

    return response.text()
}

const getErrorMessage = (body, response, fallbackMessage) => {
    if (typeof body === 'string') {
        return body || fallbackMessage
    }

    return (
        body?.error ||
        body?.message ||
        response?.statusText ||
        fallbackMessage
    )
}

export const useDashboardQuery = ({
    fallbackMessage,
    initialData,
    parse = (json) => json,
    url,
}) => {
    const { refreshVersion } = useDashboard()
    const [data, setData] = useState(initialData)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const parseRef = useRef(parse)
    const fallbackMessageRef = useRef(fallbackMessage)

    useEffect(() => {
        parseRef.current = parse
        fallbackMessageRef.current = fallbackMessage
    }, [fallbackMessage, parse])

    useEffect(() => {
        let isActive = true
        const controller = new AbortController()

        const load = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                })
                const body = await parseResponseBody(response)

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            body,
                            response,
                            fallbackMessageRef.current
                        )
                    )
                }

                const nextData = parseRef.current(body)

                if (isActive) {
                    setData(nextData)
                }
            } catch (error) {
                if (controller.signal.aborted || !isActive) {
                    return
                }

                setError(error.message || fallbackMessageRef.current)
            } finally {
                if (isActive && !controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        load()

        return () => {
            isActive = false
            controller.abort()
        }
    }, [refreshVersion, url])

    return { data, error, loading }
}
