const parseResponseBody = async (response) => {
    const contentType =
        typeof response.headers?.get === 'function'
            ? response.headers.get('content-type') || ''
            : ''

    if (contentType.includes('application/json')) {
        return response.json()
    }

    if (typeof response.text === 'function') {
        return response.text()
    }

    return response.json()
}

export const fetchJson = async (url, fallbackMessage) => {
    const response = await fetch(url)
    const body = await parseResponseBody(response)

    if (!response.ok) {
        const message =
            typeof body === 'string'
                ? body
                : body?.error || body?.message || response.statusText

        throw new Error(message || fallbackMessage)
    }

    return body
}
