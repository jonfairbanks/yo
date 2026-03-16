import { useState, useEffect, useMemo } from 'react'
import {
    useReactTable,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
} from '@tanstack/react-table'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'
import UpdateModal from './update'

const AllYos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [clickedCopy, setClickedCopy] = useState(null) // Align names
    const [selectedRow, setSelectedRow] = useState(null) // Align names
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
    const [filterQuery, setFilterQuery] = useState('')
    const [pageCount, setPageCount] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [debouncedFilterQuery, setDebouncedFilterQuery] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)

            try {
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

                const response = await fetch(`/api?${params.toString()}`)
                if (!response.ok) {
                    throw new Error('Failed to load data.')
                }

                const json = await response.json()
                setData(json.items)
                setPageCount(json.pagination.totalPages)
                setTotalItems(json.pagination.totalItems)

                if (
                    json.pagination.totalPages > 0 &&
                    pagination.pageIndex + 1 > json.pagination.totalPages
                ) {
                    setPagination((prev) => ({
                        ...prev,
                        pageIndex: json.pagination.totalPages - 1,
                    }))
                }
            } catch {
                setError('Failed to load data.')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        debouncedFilterQuery,
        refreshKey,
        sorting,
    ])

    const handleCopyClick = (linkName) => {
        setClickedCopy(linkName)
        setTimeout(() => setClickedCopy(null), 1500)
    }

    const handleEditClick = (item) => {
        setSelectedRow(item)
    }

    const handleCloseModal = () => {
        setSelectedRow(null)
        setRefreshKey((prev) => prev + 1)
    }

    const columnHelper = createColumnHelper()

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
                            onClick={() => handleEditClick(info.row.original)}
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
        [clickedCopy, columnHelper]
    )

    const table = useReactTable({
        data,
        columns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualSorting: true,
        manualPagination: true,
        pageCount,
    })

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    return (
        <div>
            <div className="row" style={{ marginBottom: '10px' }}>
                <div className="s12 input-field">
                    <input
                        id="search"
                        type="text"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        placeholder="Filter by link or URL"
                        aria-label="Filter links"
                        className="search-input"
                        style={{ backgroundColor: '#424242', color: '#fff' }}
                    />
                </div>
            </div>
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
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                </tbody>
            </table>
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
                    {table.getPageCount()} ({totalItems} links)
                </span>
                <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    ⇥
                </button>
            </div>

            {selectedRow && (
                <UpdateModal item={selectedRow} onClose={handleCloseModal} />
            )}
        </div>
    )
}

export default AllYos
