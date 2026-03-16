export const normalizeLinkName = (linkName) => {
    if (typeof linkName !== 'string') return ''

    return linkName.trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}
