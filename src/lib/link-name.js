export const normalizeLinkName = (linkName) => {
    if (typeof linkName !== 'string') return ''

    const normalized = linkName.trim().toLowerCase()
    if (!normalized) return ''

    let start = 0
    let end = normalized.length

    while (start < end && normalized.charCodeAt(start) === 47) {
        start += 1
    }

    while (end > start && normalized.charCodeAt(end - 1) === 47) {
        end -= 1
    }

    return normalized.slice(start, end)
}
