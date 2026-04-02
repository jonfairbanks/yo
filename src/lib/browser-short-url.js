const encodeLinkPath = (linkName) =>
    String(linkName ?? '')
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')

export const getShortPath = (linkName) => `/${encodeLinkPath(linkName)}`

export const getShortUrl = (linkName) => {
    const shortPath = getShortPath(linkName)

    if (typeof window === 'undefined') {
        return shortPath
    }

    return `${window.location.origin}${shortPath}`
}
