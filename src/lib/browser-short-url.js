export const getShortUrl = (linkName) => {
    if (typeof window === 'undefined') {
        return `/${linkName}`
    }

    return `${window.location.origin}/${linkName}`
}
