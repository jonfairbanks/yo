import { useState, useEffect, useMemo, useCallback } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
    useReactTable,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
} from '@tanstack/react-table'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { useDashboard } from '../context/dashboard-context'
import { useDashboardQuery } from '../hooks/use-dashboard-query'
import { getShortUrl } from '../lib/browser-short-url'
dayjs.extend(relativeTime)

const QUICK_FILTERS = [
    {
        id: 'all',
        label: 'All links',
        params: {},
    },
    {
        id: 'unused',
        label: 'Unused',
        params: { usage: 'unused' },
    },
    {
        id: 'new',
        label: 'New in 30 days',
        params: { recent: 'created', sinceDays: '30' },
    },
    {
        id: 'recently-accessed',
        label: 'Used in 30 days',
        params: { recent: 'accessed', sinceDays: '30' },
    },
]

const formatTimestamp = (value, emptyText) => {
    if (!value) {
        return emptyText
    }

    return dayjs(value).fromNow()
}

const formatSubtitle = (createdAt, lastAccess) => {
    const createdText = `Created: ${formatTimestamp(createdAt, 'Unknown')}`
    const lastAccessText = lastAccess
        ? `Last Accessed: ${formatTimestamp(lastAccess, 'No activity yet')}`
        : 'Last Accessed: never'

    return `${createdText} | ${lastAccessText}`
}

const RowActions = ({ item, onEdit, onVisit }) => {
    const [copied, setCopied] = useState(false)

    const handleCopied = () => {
        setCopied(true)
        window.setTimeout(() => {
            setCopied(false)
        }, 1500)
    }

    return (
        <div className="row-actions-grid">
            <a
                href={`/${item.linkName}`}
                className="btn-small teal white-text row-action-button"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onVisit}
                aria-label={`Visit ${item.linkName} page`}
            >
                <i className="material-icons row-action-icon">open_in_new</i>
                <span>Visit</span>
            </a>
            <CopyToClipboard
                text={getShortUrl(item.linkName)}
                onCopy={handleCopied}
            >
                <a
                    className="btn-small grey grey-text text-darken-3 row-action-button"
                    aria-label={`Copy ${item.linkName} short link`}
                >
                    <i className="material-icons row-action-icon">
                        {copied ? 'done' : 'content_copy'}
                    </i>
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </a>
            </CopyToClipboard>
            <a
                onClick={() => onEdit(item)}
                className="btn-small grey grey-text text-darken-3 row-action-button"
                aria-label={`Edit ${item.linkName}`}
            >
                <i className="material-icons row-action-icon">edit</i>
                <span>Edit</span>
            </a>
        </div>
    )
}

const AllYos = () => {
    const {
        applyTableFilter,
        clearTableFilter,
        openCreateModal,
        openUpdateModal,
        scheduleRefresh,
        tableFilter,
    } = useDashboard()
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
    const [filterQuery, setFilterQuery] = useState('')
    const [debouncedFilterQuery, setDebouncedFilterQuery] = useState('')
    const columnHelper = useMemo(() => createColumnHelper(), [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedFilterQuery(filterQuery)
        }, 250)

        return () => clearTimeout(timeoutId)
    }, [filterQuery])

    useEffect(() => {
        setPagination((prev) =>
            prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
        )
    }, [debouncedFilterQuery, tableFilter])

    const queryUrl = useMemo(() => {
        const activeSort = sorting[0] || {
            id: 'linkName',
            desc: false,
        }
        const params = new URLSearchParams({
            page: String(pagination.pageIndex + 1),
            pageSize: String(pagination.pageSize),
            sortBy: activeSort.id,
            sortDir: activeSort.desc ? 'desc' : 'asc',
        })

        if (debouncedFilterQuery.trim()) {
            params.set('q', debouncedFilterQuery.trim())
        }

        Object.entries(tableFilter?.params || {}).forEach(([key, value]) => {
            if (value) {
                params.set(key, value)
            }
        })

        return `/api?${params.toString()}`
    }, [
        debouncedFilterQuery,
        pagination.pageIndex,
        pagination.pageSize,
        sorting,
        tableFilter,
    ])

    const { data, error, loading } = useDashboardQuery({
        fallbackMessage: 'Failed to load data.',
        url: queryUrl,
        initialData: {
            items: [],
            pagination: {
                totalItems: 0,
                totalPages: 1,
            },
        },
        parse: (json) => {
            if (!json?.items || !json?.pagination) {
                throw new Error('Failed to load data.')
            }
            return json
        },
    })

    useEffect(() => {
        if (data?.pagination) {
            setHasLoadedOnce(true)

            if (
                data.pagination.totalPages > 0 &&
                pagination.pageIndex + 1 > data.pagination.totalPages
            ) {
                setPagination((prev) => ({
                    ...prev,
                    pageIndex: data.pagination.totalPages - 1,
                }))
            }
        }
    }, [data, pagination.pageIndex])

    const handleVisitClick = useCallback(() => {
        scheduleRefresh()
    }, [scheduleRefresh])

    const columns = useMemo(
        () => [
            columnHelper.accessor('linkName', {
                header: 'Link',
                cell: (info) => (
                    <pre className="row-link-name" title={info.getValue()}>
                        {info.getValue()}
                    </pre>
                ),
                enableSorting: true,
                meta: {
                    mobileLabel: 'Link',
                },
            }),
            columnHelper.accessor('originalUrl', {
                header: 'Destination',
                cell: (info) => (
                    <div className="site-url">
                        <div>{info.getValue()}</div>
                        <span className="table-meta-text">
                            {formatSubtitle(
                                info.row.original.createdAt,
                                info.row.original.lastAccess
                            )}
                        </span>
                    </div>
                ),
                enableSorting: true,
                meta: {
                    mobileLabel: 'Destination',
                },
            }),
            columnHelper.accessor('urlHits', {
                header: () => <div className="table-number-cell">Hits</div>,
                cell: (info) => (
                    <p className="grey-text text-darken-1 table-number-cell">
                        {(info.getValue() ?? 0).toLocaleString()}
                    </p>
                ),
                enableSorting: true,
                meta: {
                    mobileLabel: 'Hits',
                },
            }),
            columnHelper.display({
                id: 'actions',
                header: () => <div className="table-actions">Actions</div>,
                cell: (info) => (
                    <RowActions
                        item={info.row.original}
                        onEdit={openUpdateModal}
                        onVisit={handleVisitClick}
                    />
                ),
                meta: {
                    mobileLabel: 'Actions',
                },
            }),
        ],
        [columnHelper, handleVisitClick, openUpdateModal]
    )

    const table = useReactTable({
        data: data.items,
        columns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualPagination: true,
        pageCount: data.pagination.totalPages,
    })

    const rows = table.getRowModel().rows
    const showInitialLoading = loading && !hasLoadedOnce
    const hasSearchTerm = Boolean(debouncedFilterQuery.trim())
    const hasActiveQuickFilter = tableFilter?.id && tableFilter.id !== 'all'
    const showEmptyState = !rows.length
    const currentPage = pagination.pageIndex + 1
    const totalPages = data.pagination.totalPages || 1
    const totalItems = data.pagination.totalItems || 0

    const emptyStateTitle =
        hasSearchTerm || hasActiveQuickFilter
            ? 'No links match this view.'
            : 'No links yet.'
    const emptyStateDetail =
        hasSearchTerm || hasActiveQuickFilter
            ? 'Try clearing filters or adjusting your search.'
            : 'Create your first short link to get started.'

    return (
        <div>
            <div className="row table-search-row">
                <div className="s12 input-field">
                    <input
                        id="search"
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Filter by link or URL"
                        aria-label="Filter links"
                        className="search-input"
                        style={{ backgroundColor: '#424242', color: '#fff' }}
                    />
                </div>
            </div>

            <div className="row filter-toolbar">
                {QUICK_FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        type="button"
                        className={`btn-small ${
                            tableFilter?.id === filter.id
                                ? 'teal white-text'
                                : 'grey darken-2 white-text'
                        }`}
                        onClick={() => applyTableFilter(filter)}
                    >
                        {filter.label}
                    </button>
                ))}
                {hasActiveQuickFilter || hasSearchTerm ? (
                    <button
                        type="button"
                        className="btn-small grey grey-text text-darken-3"
                        onClick={() => {
                            setFilterQuery('')
                            setDebouncedFilterQuery('')
                            clearTableFilter()
                        }}
                    >
                        Clear filters
                    </button>
                ) : null}
                {loading && hasLoadedOnce ? (
                    <span className="grey-text text-lighten-1">
                        Refreshing results...
                    </span>
                ) : null}
            </div>

            {hasActiveQuickFilter || hasSearchTerm ? (
                <p className="grey-text text-lighten-1">
                    Viewing:{' '}
                    <strong>{tableFilter?.label || 'Filtered links'}</strong>
                    {hasSearchTerm
                        ? ` | Search: "${debouncedFilterQuery.trim()}"`
                        : ''}
                </p>
            ) : null}

            {showInitialLoading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>{error}</p>
            ) : showEmptyState ? (
                <div className="card-panel grey darken-3">
                    <h5>{emptyStateTitle}</h5>
                    <p className="grey-text text-lighten-1">
                        {emptyStateDetail}
                    </p>
                    <div className="table-actions">
                        {hasSearchTerm || hasActiveQuickFilter ? (
                            <button
                                type="button"
                                className="btn-small teal white-text"
                                onClick={() => {
                                    setFilterQuery('')
                                    setDebouncedFilterQuery('')
                                    clearTableFilter()
                                }}
                            >
                                Clear filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn-small teal white-text"
                                onClick={() => openCreateModal()}
                            >
                                Create first link
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <table className="yo-table yo-table-cards yo-table-all">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            onClick={header.column.getToggleSortingHandler()}
                                            style={{
                                                cursor: header.column.getCanSort()
                                                    ? 'pointer'
                                                    : 'default',
                                            }}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext()
                                                  )}
                                            {{
                                                asc: ' ⬆',
                                                desc: ' ⬇',
                                            }[header.column.getIsSorted()] ||
                                                null}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            data-label={
                                                cell.column.columnDef.meta
                                                    ?.mobileLabel ||
                                                cell.column.id
                                            }
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="table-pagination" aria-label="Pagination">
                        <p className="table-pagination-summary grey-text text-lighten-1">
                            Page {currentPage} of {totalPages} ({totalItems}{' '}
                            links)
                        </p>
                        <div className="table-pagination-actions">
                            <button
                                type="button"
                                className="btn-small grey grey-text text-darken-3"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                aria-label="Go to previous page"
                            >
                                <i className="material-icons left">
                                    chevron_left
                                </i>
                                Previous
                            </button>
                            <button
                                type="button"
                                className="btn-small teal white-text"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                aria-label="Go to next page"
                            >
                                Next
                                <i className="material-icons right">
                                    chevron_right
                                </i>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default AllYos
