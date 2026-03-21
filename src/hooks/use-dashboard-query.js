import { useEffect, useRef, useState } from 'react'

import { fetchJson } from '../lib/fetch-json'
import { useDashboard } from '../context/dashboard-context'

export const useDashboardQuery = ({
    enabled = true,
    fallbackMessage,
    url,
    initialData,
    parse,
}) => {
    const { refreshVersion } = useDashboard()
    const [data, setData] = useState(initialData)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const parseRef = useRef(parse)

    useEffect(() => {
        parseRef.current = parse
    }, [parse])

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        let cancelled = false

        const fetchData = async () => {
            setLoading(true)
            setError(null)

            try {
                const json = await fetchJson(url, fallbackMessage)
                const nextData =
                    typeof parseRef.current === 'function'
                        ? parseRef.current(json)
                        : json

                if (!cancelled) {
                    setData(nextData)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || fallbackMessage)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [enabled, fallbackMessage, refreshVersion, url])

    return {
        data,
        error,
        loading,
        setData,
    }
}
