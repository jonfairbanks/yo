import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    useReactTable,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
} from '@tanstack/react-table'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'
import { useDashboard } from '../context/dashboard-context'
import { useDashboardQuery } from '../hooks/use-dashboard-query'

const AllYos = () => {
    const { openUpdateModal, scheduleRefresh } = useDashboard()
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
    const [clickedCopy, setClickedCopy] = useState(null) // Align names
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
    }, [debouncedFilterQuery])

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

        return `/api?${params.toString()}`
    }, [debouncedFilterQuery, pagination.pageIndex, pagination.pageSize, sorting])

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

    const handleCopyClick = useCallback((linkName) => {
        setClickedCopy(linkName)
        setTimeout(() => setClickedCopy(null), 1500)
    }, [])

    const handleVisitClick = useCallback(() => {
        scheduleRefresh()
    }, [scheduleRefresh])

    const columns = useMemo(
        () => [
            columnHelper.accessor('linkName', {
                header: 'Link',
                cell: (info) => (
                    <CopyToClipboard
                        text={getShortUrl(info.getValue())}
                    >
                        <pre style={{ cursor: 'pointer' }}>
                            {info.getValue()}
                        </pre>
                    </CopyToClipboard>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('originalUrl', {
                header: 'Site URL',
                cell: (info) => (
                    <a
                        className="grey-text text-darken-1"
                        href={`/${info.row.original.linkName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleVisitClick}
                    >
                        {info.getValue()}
                    </a>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('urlHits', {
                header: () => <div className="table-number-cell">URL Hits</div>,
                cell: (info) => (
                    <p className="grey-text text-darken-1 table-number-cell">
                        {(info.getValue() ?? 0).toLocaleString()}
                    </p>
                ),
                enableSorting: true,
            }),
            columnHelper.display({
                id: 'options',
                header: () => <div className="table-actions">Options</div>,
                cell: (info) => (
                    <div className="table-actions">
                        <a
                            onClick={() => openUpdateModal(info.row.original)}
                            className="btn-small icon-left grey grey-text text-darken-2"
                            aria-label={`Edit ${info.row.original.linkName}`}
                        >
                            <i className="material-icons">edit</i>Edit
                        </a>
                        {clickedCopy === info.row.original.linkName ? (
                            <a
                                className="btn-small icon-left teal white-text text-darken-2"
                                aria-label={`Copy ${info.row.original.linkName} link`}
                            >
                                <i className="material-icons">done</i> Copy
                            </a>
                        ) : (
                            <CopyToClipboard
                                text={getShortUrl(
                                    info.row.original.linkName
                                )}
                                onCopy={() =>
                                    handleCopyClick(info.row.original.linkName)
                                }
                            >
                                <a
                                    className="btn-small icon-left teal darken-2 white-text text-darken-2"
                                    aria-label={`Copy ${info.row.original.linkName} link`}
                                >
                                    <i className="material-icons">
                                        content_copy
                                    </i>{' '}
                                    Copy
                                </a>
                            </CopyToClipboard>
                        )}
                    </div>
                ),
            }),
        ],
        [clickedCopy, columnHelper, handleVisitClick, openUpdateModal, handleCopyClick]
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
    const isFilteredEmptyState = Boolean(debouncedFilterQuery.trim())
    const emptyStateMessage = isFilteredEmptyState
        ? 'No links match your search.'
        : 'No links available yet.'
    const showInitialLoading = loading && !hasLoadedOnce

    return (
        <div>
            <div className="row" style={{ marginBottom: '10px' }}>
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
            {showInitialLoading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>{error}</p>
            ) : (
                <table className="yo-table">
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
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                        {{
                                            asc: ' ⬆',
                                            desc: ' ⬇',
                                        }[header.column.getIsSorted()] || null}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {rows.length ? (
                            rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={
                                                cell.column.id === 'originalUrl'
                                                    ? 'url-cell'
                                                    : ''
                                            }
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    style={{
                                        color: isFilteredEmptyState
                                            ? '#acacac'
                                            : '#9e9e9e',
                                        textAlign: 'center',
                                    }}
                                >
                                    {emptyStateMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
            {loading && !showInitialLoading && !error ? (
                <p
                    className="grey-text text-darken-1"
                    style={{ marginTop: '10px' }}
                >
                    Refreshing results...
                </p>
            ) : null}
            {!showInitialLoading && error ? (
                <p className="red-text text-darken-1">{error}</p>
            ) : null}
            <br />
            <div className="pagination">
                <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    ⇤
                </button>
                <span
                    className="grey-text text-darken-1"
                    style={{ marginLeft: '10px', marginRight: '10px' }}
                >
                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                    {table.getPageCount()} ({data.pagination.totalItems} links)
                </span>
                <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    ⇥
                </button>
            </div>
        </div>
    )
}

export default AllYos
