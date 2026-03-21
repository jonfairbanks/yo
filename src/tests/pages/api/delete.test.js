import { createMocks } from 'node-mocks-http'

import { auth0 } from '../../../lib/auth0'
import handler from '../../../pages/api/delete'
import { deleteAlias } from '../../../services/yo-service'

jest.mock('../../../lib/auth0', () => ({
    auth0: {
        getSession: jest.fn(),
    },
}))

jest.mock('../../../services/yo-service', () => ({
    deleteAlias: jest.fn(),
}))

jest.mock('../../../lib/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock('../../../lib/tracing', () => ({
    withSpan: jest.fn(async (_name, attributesOrCallback, maybeCallback) => {
        const callback =
            typeof attributesOrCallback === 'function'
                ? attributesOrCallback
                : maybeCallback

        return callback({
            setAttribute: jest.fn(),
        })
    }),
}))

describe('delete API handler', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        auth0.getSession.mockResolvedValue({
            user: { nickname: 'tester' },
        })
        deleteAlias.mockResolvedValue({
            message: 'docs deleted successfully.',
        })
    })

    it('rejects non-DELETE requests', async () => {
        const { req, res } = createMocks({
            method: 'POST',
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(405)
        expect(res._getJSONData()).toEqual({
            error: 'Method not allowed. Use DELETE.',
        })
        expect(auth0.getSession).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated requests', async () => {
        auth0.getSession.mockResolvedValue(null)
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Unauthorized' })
        expect(deleteAlias).not.toHaveBeenCalled()
    })

    it('requires a link name', async () => {
        deleteAlias.mockRejectedValue({
            code: 'invalid_alias',
            message: 'No link name provided.',
            statusCode: 400,
        })
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {},
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)
        expect(res._getJSONData()).toEqual({
            error: 'No link name provided.',
        })
        expect(deleteAlias).toHaveBeenCalledTimes(1)
    })

    it('deletes an existing alias', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(deleteAlias).toHaveBeenCalledWith({
            actorNickname: 'tester',
            linkName: 'docs',
            span: expect.any(Object),
        })
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            message: 'docs deleted successfully.',
        })
    })

    it('normalizes link names before deleting', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: ' /Docs/ ',
            },
        })

        await handler(req, res)

        expect(deleteAlias).toHaveBeenCalledTimes(1)
        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({
            message: 'docs deleted successfully.',
        })
    })

    it('returns not found when the alias does not exist', async () => {
        deleteAlias.mockRejectedValue({
            code: 'missing',
            message: 'Alias missing not found.',
            statusCode: 404,
        })
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'missing',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(404)
        expect(res._getJSONData()).toEqual({
            error: 'Alias missing not found.',
        })
    })

    it('returns a server error when deletion fails', async () => {
        deleteAlias.mockRejectedValue(new Error('db down'))
        const { req, res } = createMocks({
            method: 'DELETE',
            body: {
                linkName: 'docs',
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)
        expect(res._getJSONData()).toEqual({
            error: 'Failed to delete the short link.',
        })
    })
})
