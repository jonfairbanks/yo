import { useEffect, useMemo, useState } from 'react'

import { fetchJson } from '../lib/fetch-json'
import { normalizeLinkName } from '../lib/link-name'
import { getReservedPathMatch } from '../lib/reserved-routes'

export const useSlugValidation = (linkName) => {
    const normalizedLinkName = useMemo(
        () => normalizeLinkName(linkName),
        [linkName]
    )
    const [duplicateError, setDuplicateError] = useState(null)
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

    const reservedPath = useMemo(
        () => getReservedPathMatch(linkName),
        [linkName]
    )

    useEffect(() => {
        if (!normalizedLinkName || reservedPath) {
            setDuplicateError(null)
            setIsCheckingDuplicate(false)
            return undefined
        }

        let cancelled = false
        const timeoutId = window.setTimeout(async () => {
            setIsCheckingDuplicate(true)
            try {
                const json = await fetchJson(
                    `/api?exactLinkName=${encodeURIComponent(normalizedLinkName)}&pageSize=1`,
                    'Failed to validate link name.'
                )

                if (!cancelled) {
                    const exists = Array.isArray(json?.items)
                        ? json.items.some(
                              (item) => item.linkName === normalizedLinkName
                          )
                        : false

                    setDuplicateError(
                        exists ? 'That link name is already in use.' : null
                    )
                }
            } catch {
                if (!cancelled) {
                    setDuplicateError(null)
                }
            } finally {
                if (!cancelled) {
                    setIsCheckingDuplicate(false)
                }
            }
        }, 250)

        return () => {
            cancelled = true
            window.clearTimeout(timeoutId)
        }
    }, [normalizedLinkName, reservedPath])

    const validationMessage = useMemo(() => {
        if (!linkName?.trim()) {
            return null
        }

        if (!normalizedLinkName) {
            return 'A link name is required.'
        }

        if (reservedPath) {
            return `The link name collides with a reserved route: ${reservedPath}`
        }

        return duplicateError
    }, [duplicateError, linkName, normalizedLinkName, reservedPath])

    return {
        isCheckingDuplicate,
        isValid: !validationMessage,
        normalizedLinkName,
        validationMessage,
    }
}
