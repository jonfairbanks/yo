import { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import UpdateModal from './update'

const AllYos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [clickedCopy, setClickedCopy] = useState(null) // Align names
    const [selectedRow, setSelectedRow] = useState(null) // Align names

    // Fetch data function
    const fetchData = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api')
            const json = await response.json()
            setData(json)
            setLoading(false)
        } catch (error) {
            setError('Failed to load data')
            setLoading(false)
        }
    }

    // Fetch data on component mount
    useEffect(() => {
        fetchData()
    }, [])

    const handleCopyClick = (linkName) => {
        setClickedCopy(linkName)
        setTimeout(() => setClickedCopy(null), 2500)
    }

    const handleEditClick = (item) => {
        setSelectedRow(item) // Set selected row for the modal
    }

    const handleCloseModal = () => {
        setSelectedRow(null) // Reset selectedRow when modal closes
        fetchData()
    }

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Link</th>
                        <th>Site URL</th>
                        <th>URL Hits</th>
                        <th>Options</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index}>
                            <td width="15%">
                                <CopyToClipboard
                                    text={`${window.location.host}/${item.linkName}`}
                                >
                                    <pre style={{ cursor: 'pointer' }}>
                                        {item.linkName}
                                    </pre>
                                </CopyToClipboard>
                            </td>
                            <td className="site-url" width="55%">
                                <a
                                    className="grey-text text-darken-1"
                                    href={`/api/redirect/${item.linkName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.originalUrl}
                                </a>
                            </td>
                            <td width="10%">
                                <p className="grey-text text-darken-1">
                                    {item.urlHits}
                                </p>
                            </td>
                            <td width="20%">
                                {clickedCopy === item.linkName ? (
                                    <a
                                        className="btn-small icon-left teal white-text text-darken-2"
                                        style={{ marginRight: '5px' }}
                                    >
                                        <i className="material-icons">done</i>
                                        Copy
                                    </a>
                                ) : (
                                    <CopyToClipboard
                                        text={`${window.location.host}/${item.linkName}`}
                                        onCopy={() =>
                                            handleCopyClick(item.linkName)
                                        }
                                    >
                                        <a
                                            className="btn-small icon-left teal darken-2 white-text text-darken-2"
                                            style={{ marginRight: '5px' }}
                                        >
                                            <i className="material-icons">
                                                content_copy
                                            </i>
                                            Copy
                                        </a>
                                    </CopyToClipboard>
                                )}
                                <a
                                    onClick={() => handleEditClick(item)}
                                    className="btn-small icon-left grey grey-text text-darken-2"
                                >
                                    <i className="material-icons">edit</i>Edit
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Render UpdateModal only if selectedRow is not null */}
            {selectedRow && (
                <UpdateModal item={selectedRow} onClose={handleCloseModal} />
            )}
        </div>
    )
}

export default AllYos
