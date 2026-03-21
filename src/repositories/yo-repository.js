import { connectToDatabase } from '../lib/mongoose'
import { withSpan } from '../lib/tracing'
import Yo from '../models/yo'

export const insertAlias = async ({ linkName, originalUrl, shortUrl }) => {
    await connectToDatabase()

    const item = new Yo({
        linkName,
        originalUrl,
        shortUrl,
    })

    await withSpan(
        'mongo create alias',
        {
            'db.system': 'mongodb',
            'db.operation': 'save',
            'db.collection': 'yo',
            'db.query.summary': 'insert alias document',
            'yo.alias': linkName,
        },
        () => item.save()
    )

    return item
}

export const updateAliasByLinkName = async ({ linkName, originalUrl }) => {
    await connectToDatabase()

    return withSpan(
        'mongo update alias',
        {
            'db.system': 'mongodb',
            'db.operation': 'findOneAndUpdate',
            'db.collection': 'yo',
            'db.query.summary':
                'find alias by linkName and update originalUrl, updatedAt',
            'yo.alias': linkName,
        },
        () =>
            Yo.findOneAndUpdate(
                { linkName },
                { $set: { originalUrl } },
                { new: true }
            ).lean()
    )
}

export const deleteAliasByLinkName = async (linkName) => {
    await connectToDatabase()

    return withSpan(
        'mongo delete alias',
        {
            'db.system': 'mongodb',
            'db.operation': 'findOneAndDelete',
            'db.collection': 'yo',
            'db.query.summary': 'delete alias by linkName',
            'yo.alias': linkName,
        },
        () => Yo.findOneAndDelete({ linkName }).lean()
    )
}

export const findAliases = async ({
    page,
    pageSize,
    searchQuery,
    sortBy,
    sortDir,
}) => {
    await connectToDatabase()

    return withSpan(
        'mongo list aliases',
        {
            'db.system': 'mongodb',
            'db.operation': 'find',
            'db.collection': 'yo',
            'db.query.summary': 'find aliases with pagination, filter, and sorting',
        },
        async () => {
            const [items, totalItems] = await Promise.all([
                Yo.find(searchQuery, {
                    linkName: 1,
                    originalUrl: 1,
                    urlHits: 1,
                    _id: 0,
                })
                    .sort({ [sortBy]: sortDir, linkName: 1 })
                    .skip((page - 1) * pageSize)
                    .limit(pageSize)
                    .lean(),
                Yo.countDocuments(searchQuery),
            ])

            return { items, totalItems }
        }
    )
}

export const findLatestAliases = async (limit = 10) => {
    await connectToDatabase()

    return withSpan(
        'mongo find latest aliases',
        {
            'db.system': 'mongodb',
            'db.operation': 'find',
            'db.collection': 'yo',
            'db.query.summary': 'find aliases sorted by lastAccess desc limit 10',
        },
        () =>
            Yo.find(
                {},
                {
                    linkName: 1,
                    originalUrl: 1,
                    lastAccess: 1,
                    _id: 0,
                }
            )
                .sort({ lastAccess: -1, linkName: 1 })
                .limit(limit)
                .lean()
    )
}

export const findPopularAliases = async (limit = 10) => {
    await connectToDatabase()

    return withSpan(
        'mongo find popular aliases',
        {
            'db.system': 'mongodb',
            'db.operation': 'find',
            'db.collection': 'yo',
            'db.query.summary': 'find aliases sorted by urlHits desc limit 10',
        },
        () =>
            Yo.find(
                {},
                {
                    linkName: 1,
                    originalUrl: 1,
                    urlHits: 1,
                    _id: 0,
                }
            )
                .sort({ urlHits: -1, linkName: 1 })
                .limit(limit)
                .lean()
    )
}

export const findStatsSummary = async ({ recentThreshold }) => {
    await connectToDatabase()

    return withSpan(
        'mongo collect stats',
        {
            'db.system': 'mongodb',
            'db.operation': 'aggregate',
            'db.collection': 'yo',
            'db.query.summary':
                'aggregate alias stats, newest alias, latest access, and popular alias',
        },
        async () => {
            const [result = {}] = await Yo.aggregate([
                {
                    $facet: {
                        latestAccessedYo: [
                            {
                                $match: {
                                    lastAccess: { $type: 'date' },
                                },
                            },
                            {
                                $sort: {
                                    lastAccess: -1,
                                    linkName: 1,
                                },
                            },
                            { $limit: 1 },
                            {
                                $project: {
                                    _id: 0,
                                    lastAccess: 1,
                                    linkName: 1,
                                },
                            },
                        ],
                        newestYo: [
                            {
                                $match: {
                                    createdAt: { $type: 'date' },
                                },
                            },
                            {
                                $sort: {
                                    createdAt: -1,
                                    linkName: 1,
                                },
                            },
                            { $limit: 1 },
                            {
                                $project: {
                                    _id: 0,
                                    createdAt: 1,
                                    linkName: 1,
                                },
                            },
                        ],
                        popularYo: [
                            {
                                $project: {
                                    linkName: 1,
                                    urlHits: {
                                        $cond: [
                                            { $gt: [{ $ifNull: ['$urlHits', 0] }, 0] },
                                            { $ifNull: ['$urlHits', 0] },
                                            0,
                                        ],
                                    },
                                },
                            },
                            {
                                $sort: {
                                    urlHits: -1,
                                    linkName: 1,
                                },
                            },
                            { $limit: 1 },
                            {
                                $project: {
                                    _id: 0,
                                    linkName: 1,
                                    urlHits: 1,
                                },
                            },
                        ],
                        totals: [
                            {
                                $group: {
                                    _id: null,
                                    activeYos: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: [
                                                        { $ifNull: ['$urlHits', 0] },
                                                        0,
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                    recentlyAccessedYos: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        {
                                                            $ne: [
                                                                { $ifNull: ['$lastAccess', null] },
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $gte: [
                                                                '$lastAccess',
                                                                recentThreshold,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                    recentlyCreatedYos: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        {
                                                            $ne: [
                                                                { $ifNull: ['$createdAt', null] },
                                                                null,
                                                            ],
                                                        },
                                                        {
                                                            $gte: [
                                                                '$createdAt',
                                                                recentThreshold,
                                                            ],
                                                        },
                                                    ],
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    },
                                    totalHits: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: [
                                                        { $ifNull: ['$urlHits', 0] },
                                                        0,
                                                    ],
                                                },
                                                { $ifNull: ['$urlHits', 0] },
                                                0,
                                            ],
                                        },
                                    },
                                    totalYos: { $sum: 1 },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    activeYos: 1,
                                    recentlyAccessedYos: 1,
                                    recentlyCreatedYos: 1,
                                    totalHits: 1,
                                    totalYos: 1,
                                    unusedYos: {
                                        $subtract: ['$totalYos', '$activeYos'],
                                    },
                                },
                            },
                        ],
                    },
                },
            ])

            return {
                latestAccessedYo: result.latestAccessedYo?.[0] || null,
                newestYo: result.newestYo?.[0] || null,
                popularYo: result.popularYo?.[0] || null,
                totals:
                    result.totals?.[0] || {
                        activeYos: 0,
                        recentlyAccessedYos: 0,
                        recentlyCreatedYos: 0,
                        totalHits: 0,
                        totalYos: 0,
                        unusedYos: 0,
                    },
            }
        }
    )
}
