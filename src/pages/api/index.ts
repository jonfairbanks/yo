import type { Span } from '@opentelemetry/api'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../lib/auth0'
import { withSpan } from '../../lib/tracing'

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const SORT_FIELDS = new Set(['linkName', 'originalUrl', 'urlHits'])

const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parsePositiveInteger = (
    value: string | string[] | undefined,
    defaultValue: number
) => {
    const parsed = Number.parseInt(
        Array.isArray(value) ? value[0] : value || '',
        10
    )

    if (Number.isNaN(parsed) || parsed < 1) {
        return defaultValue
    }

    return parsed
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return withSpan(
        'GET /api',
        {
            'http.route': '/api',
            'http.request.method': req.method,
        },
        async (span: Span) => {
            const session = await auth0.getSession(req)
            span.setAttribute('enduser.authenticated', Boolean(session))
            if (!session) {
                span.setAttribute('http.response.status_code', 401)
                return res.status(401).json({ error: 'Unauthorized' })
            }

            await connectToDatabase()

            const page = parsePositiveInteger(req.query.page, 1)
            const pageSize = Math.min(
                parsePositiveInteger(req.query.pageSize, DEFAULT_PAGE_SIZE),
                MAX_PAGE_SIZE
            )
            const filterQuery = Array.isArray(req.query.q)
                ? req.query.q[0] || ''
                : req.query.q || ''
            const sortBy = SORT_FIELDS.has(
                Array.isArray(req.query.sortBy)
                    ? req.query.sortBy[0] || ''
                    : req.query.sortBy || ''
            )
                ? (Array.isArray(req.query.sortBy)
                      ? req.query.sortBy[0]
                      : req.query.sortBy) || 'linkName'
                : 'linkName'
            const sortDir =
                (Array.isArray(req.query.sortDir)
                    ? req.query.sortDir[0]
                    : req.query.sortDir) === 'desc'
                    ? -1
                    : 1

            const trimmedFilter = filterQuery.trim()
            const query = trimmedFilter
                ? {
                      $or: [
                          {
                              linkName: {
                                  $regex: escapeRegex(trimmedFilter),
                                  $options: 'i',
                              },
                          },
                          {
                              originalUrl: {
                                  $regex: escapeRegex(trimmedFilter),
                                  $options: 'i',
                              },
                          },
                      ],
                  }
                : {}

            const yoUrls = await withSpan(
                'mongo list aliases',
                {
                    'db.system': 'mongodb',
                    'db.operation': 'find',
                    'db.collection': 'yo',
                    'db.query.summary':
                        'find aliases with pagination, filter, and sorting',
                },
                async () => {
                    const [items, totalItems] = await Promise.all([
                        Yo.find(query, {
                            linkName: 1,
                            originalUrl: 1,
                            urlHits: 1,
                            _id: 0,
                        })
                            .sort({ [sortBy]: sortDir })
                            .skip((page - 1) * pageSize)
                            .limit(pageSize)
                            .lean(),
                        Yo.countDocuments(query),
                    ])

                    return {
                        items: items.map((item) => ({
                            ...item,
                            urlHits:
                                typeof item.urlHits === 'number'
                                    ? item.urlHits
                                    : 0,
                        })),
                        totalItems,
                    }
                }
            )

            const totalPages = Math.max(
                1,
                Math.ceil(yoUrls.totalItems / pageSize)
            )

            span.setAttribute('yo.result_count', yoUrls.items.length)
            span.setAttribute('yo.total_count', yoUrls.totalItems)
            span.setAttribute('yo.page', page)
            span.setAttribute('yo.page_size', pageSize)
            span.setAttribute('http.response.status_code', 200)
            res.status(200).json({
                items: yoUrls.items,
                pagination: {
                    page,
                    pageSize,
                    totalItems: yoUrls.totalItems,
                    totalPages,
                },
            })
        }
    )
}
