const parseResponseBody = async (response) => {
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
        return response.json()
    }

    return response.text()
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
