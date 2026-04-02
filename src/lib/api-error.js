export class ApiError extends Error {
    constructor(statusCode, message, options = {}) {
        super(message)
        this.name = 'ApiError'
        this.statusCode = statusCode
        this.code = options.code || null
    }
}

export const isApiError = (error) =>
    Boolean(error) &&
    typeof error === 'object' &&
    typeof error.statusCode === 'number' &&
    typeof error.message === 'string'
