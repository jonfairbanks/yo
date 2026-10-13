import { connectToDatabase } from '../lib/mongoose'
import Yo from '../models/yo'
import { findAliases } from './yo-repository'

jest.mock('../lib/mongoose', () => ({
    connectToDatabase: jest.fn(),
}))

jest.mock('../lib/tracing', () => ({
    withSpan: jest.fn(async (_name, _attributes, callback) => callback()),
}))

jest.mock('../models/yo', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        countDocuments: jest.fn(),
    },
}))

describe('findAliases', () => {
    let query
    const items = [{ linkName: 'docs', urlHits: 12 }]

    beforeEach(() => {
        query = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(items),
        }
        Yo.find.mockReturnValue(query)
        Yo.countDocuments.mockResolvedValue(31)
    })

    it.each([1, -1])('preserves name sort direction %s', async (sortDir) => {
        await findAliases({
            page: 1,
            pageSize: 10,
            searchQuery: {},
            sortBy: 'linkName',
            sortDir,
        })

        expect(query.sort).toHaveBeenCalledWith({ linkName: sortDir })
    })

    it.each([
        ['urlHits', 1],
        ['urlHits', -1],
        ['originalUrl', 1],
        ['originalUrl', -1],
    ])(
        'breaks %s ties by ascending name for direction %s',
        async (sortBy, sortDir) => {
            await findAliases({
                page: 1,
                pageSize: 10,
                searchQuery: {},
                sortBy,
                sortDir,
            })

            expect(query.sort).toHaveBeenCalledWith({
                [sortBy]: sortDir,
                linkName: 1,
            })
            expect(Object.keys(query.sort.mock.calls[0][0])).toEqual([
                sortBy,
                'linkName',
            ])
        }
    )

    it('applies the same filter to paginated items and their total', async () => {
        const searchQuery = { linkName: { $regex: 'docs', $options: 'i' } }

        await expect(
            findAliases({
                page: 3,
                pageSize: 10,
                searchQuery,
                sortBy: 'linkName',
                sortDir: -1,
            })
        ).resolves.toEqual({ items, totalItems: 31 })

        expect(connectToDatabase).toHaveBeenCalledTimes(1)
        expect(Yo.find).toHaveBeenCalledWith(searchQuery, {
            createdAt: 1,
            lastAccess: 1,
            linkName: 1,
            originalUrl: 1,
            urlHits: 1,
            _id: 0,
        })
        expect(Yo.countDocuments).toHaveBeenCalledWith(searchQuery)
        expect(query.skip).toHaveBeenCalledWith(20)
        expect(query.limit).toHaveBeenCalledWith(10)
        expect(query.lean).toHaveBeenCalledTimes(1)
    })
})
