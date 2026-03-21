import { ApiError } from '../lib/api-error'
import {
    createAlias,
    deleteAlias,
    getPopularAliases,
    getStats,
    listAliases,
    updateAlias,
} from './yo-service'
import * as repository from '../repositories/yo-repository'

jest.mock('../repositories/yo-repository', () => ({
    deleteAliasByLinkName: jest.fn(),
    findAliases: jest.fn(),
    findLatestAliases: jest.fn(),
    findPopularAliases: jest.fn(),
    findStatsSummary: jest.fn(),
    insertAlias: jest.fn(),
    updateAliasByLinkName: jest.fn(),
}))

jest.mock('../lib/redirect', () => ({
    resolveRedirect: jest.fn(),
}))

jest.mock('../lib/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

describe('yo-service', () => {
    const span = {
        setAttribute: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        process.env.SHORT_BASE_URL = 'https://yo.test'
    })

    it('creates aliases with normalized names and short URLs', async () => {
        repository.insertAlias.mockResolvedValue({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
            shortUrl: 'https://yo.test/docs',
        })

        await expect(
            createAlias({
                linkName: ' /Docs/ ',
                originalUrl: 'https://example.com/docs',
                shortBaseUrl: process.env.SHORT_BASE_URL,
                span,
            })
        ).resolves.toEqual({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
            shortUrl: 'https://yo.test/docs',
        })

        expect(repository.insertAlias).toHaveBeenCalledWith({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
            shortUrl: 'https://yo.test/docs',
        })
    })

    it('maps duplicate alias inserts to a conflict error', async () => {
        repository.insertAlias.mockRejectedValue({ code: 11000 })

        await expect(
            createAlias({
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
                shortBaseUrl: process.env.SHORT_BASE_URL,
                span,
            })
        ).rejects.toMatchObject({
            message: 'This name is already in-use. Please select another name.',
            statusCode: 409,
        })
    })

    it('updates aliases through the repository layer', async () => {
        repository.updateAliasByLinkName.mockResolvedValue({
            linkName: 'docs',
        })

        await expect(
            updateAlias({
                linkName: ' /Docs/ ',
                originalUrl: 'https://example.com/updated',
                span,
            })
        ).resolves.toEqual({
            message: 'docs updated successfully.',
        })

        expect(repository.updateAliasByLinkName).toHaveBeenCalledWith({
            linkName: 'docs',
            originalUrl: 'https://example.com/updated',
        })
    })

    it('returns a typed not found error when updating a missing alias', async () => {
        repository.updateAliasByLinkName.mockResolvedValue(null)

        await expect(
            updateAlias({
                linkName: 'missing',
                originalUrl: 'https://example.com/missing',
                span,
            })
        ).rejects.toBeInstanceOf(ApiError)
    })

    it('deletes aliases through the repository layer', async () => {
        repository.deleteAliasByLinkName.mockResolvedValue({
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
        })

        await expect(
            deleteAlias({
                actorNickname: 'tester',
                linkName: ' /Docs/ ',
                span,
            })
        ).resolves.toEqual({
            message: 'docs deleted successfully.',
        })

        expect(repository.deleteAliasByLinkName).toHaveBeenCalledWith('docs')
    })

    it('parses list query options before hitting the repository', async () => {
        repository.findAliases.mockResolvedValue({
            items: [
                {
                    linkName: 'docs',
                    originalUrl: 'https://example.com/docs',
                },
            ],
            totalItems: 1,
        })

        await expect(
            listAliases({
                query: {
                    page: '2',
                    pageSize: '20',
                    q: 'docs',
                    sortBy: 'urlHits',
                    sortDir: 'desc',
                },
                span,
            })
        ).resolves.toEqual({
            items: [
                {
                    linkName: 'docs',
                    originalUrl: 'https://example.com/docs',
                    urlHits: 0,
                },
            ],
            pagination: {
                page: 2,
                pageSize: 20,
                totalItems: 1,
                totalPages: 1,
            },
        })

        expect(repository.findAliases).toHaveBeenCalledWith({
            page: 2,
            pageSize: 20,
            searchQuery: {
                $or: [
                    {
                        linkName: {
                            $regex: 'docs',
                            $options: 'i',
                        },
                    },
                    {
                        originalUrl: {
                            $regex: 'docs',
                            $options: 'i',
                        },
                    },
                ],
            },
            sortBy: 'urlHits',
            sortDir: -1,
        })
    })

    it('normalizes missing hit counters in popular aliases', async () => {
        repository.findPopularAliases.mockResolvedValue([
            {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            },
        ])

        await expect(getPopularAliases({ span })).resolves.toEqual([
            {
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
                urlHits: 0,
            },
        ])
    })

    it('aggregates stats without route-layer mocks', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(
            new Date('2026-03-15T12:00:00.000Z').getTime()
        )
        repository.findStatsSummary.mockResolvedValue({
            latestAccessedYo: {
                lastAccess: '2026-03-14T09:00:00.000Z',
                linkName: 'alpha',
            },
            newestYo: {
                createdAt: '2026-03-10T10:00:00.000Z',
                linkName: 'alpha',
            },
            popularYo: {
                linkName: 'alpha',
                urlHits: 10,
            },
            totals: {
                activeYos: 1,
                recentlyAccessedYos: 1,
                recentlyCreatedYos: 1,
                totalHits: 10,
                totalYos: 2,
                unusedYos: 1,
            },
        })

        await expect(getStats({ span })).resolves.toEqual({
            activeYos: 1,
            averageHitsPerYo: 5,
            latestAccessedYo: {
                lastAccess: '2026-03-14T09:00:00.000Z',
                linkName: 'alpha',
            },
            newestYo: {
                createdAt: '2026-03-10T10:00:00.000Z',
                linkName: 'alpha',
            },
            popularYo: {
                linkName: 'alpha',
                urlHits: 10,
            },
            recentlyAccessedYos: 1,
            recentlyCreatedYos: 1,
            recentWindowDays: 30,
            totalHits: 10,
            totalYos: 2,
            unusedYos: 1,
        })

        Date.now.mockRestore()
    })
})
