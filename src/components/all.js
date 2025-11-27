import { useState, useEffect, useMemo } from 'react'
import {
    useReactTable,
    createColumnHelper,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
} from '@tanstack/react-table'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import UpdateModal from './update'

const AllYos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [clickedCopy, setClickedCopy] = useState(null) // Align names
    const [selectedRow, setSelectedRow] = useState(null) // Align names
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api')
            const json = await response.json()
            setData(json)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            setLoading(false)
        } catch (error) {
            setError('Failed to load data:', error)
            setLoading(false)
        }
    }

    // Fetch data on component mount
    useEffect(() => {
        fetchData()
    }, [])

    const handleCopyClick = (linkName) => {
        setClickedCopy(linkName)
        setTimeout(() => setClickedCopy(null), 1500)
    }

    const handleEditClick = (item) => {
        setSelectedRow(item)
    }

    const handleCloseModal = () => {
        setSelectedRow(null)
        fetchData()
    }

    const columnHelper = createColumnHelper()

    const columns = useMemo(
        () => [
            columnHelper.accessor('linkName', {
                header: 'Link',
                cell: (info) => (
                    <CopyToClipboard
                        text={`${window.location.host}/${info.getValue()}`}
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
                        href={`/api/redirect/${info.row.original.linkName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {info.getValue()}
                    </a>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('urlHits', {
                header: 'URL Hits',
                cell: (info) => (
                    <p className="grey-text text-darken-1">
                        {info.getValue().toLocaleString()}
                    </p>
                ),
                enableSorting: true,
            }),
            columnHelper.display({
                id: 'options',
                header: 'Options',
                cell: (info) => (
                    <>
                        <a
                            onClick={() => handleEditClick(info.row.original)}
                            className="btn-small icon-left grey grey-text text-darken-2"
                            style={{ marginRight: '5px' }}
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
                                text={`${window.location.host}/${info.row.original.linkName}`}
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
                    </>
                ),
            }),
        ],
        [clickedCopy]
    )

    const table = useReactTable({
        data,
        columns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: false,
        pageCount: Math.ceil(data.length / pagination.pageSize),
    })

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    return (
        <div>
            <table>
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
                                        : header.column.columnDef.header}
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
                                    {cell.column.columnDef.cell(
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
                    {table.getPageCount()}
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
