import { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'
import { fetchJson } from '../lib/fetch-json'

const PopularYos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch data from API on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const json = await fetchJson(
                    '/api/popular',
                    'Failed to load popular data.'
                )
                if (!Array.isArray(json)) {
                    throw new Error('Failed to load popular data.')
                }
                setData(json)
                setLoading(false)
            } catch (error) {
                setError(error.message || 'Failed to load popular data.')
                setLoading(false)
            }
        }

        fetchData()
    }, []) // Empty dependency array means this effect runs once on mount

    if (loading) {
        return <p>Loading...</p>
    }

    if (error) {
        return <p>{error}</p>
    }

    return (
        <table className="yo-table">
            <thead>
                <tr>
                    <th>Link</th>
                    <th>Site URL</th>
                    <th>URL Hits</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td width="15%">
                            <CopyToClipboard text={getShortUrl(item.linkName)}>
                                <pre style={{ cursor: 'pointer' }}>
                                    {item.linkName}
                                </pre>
                            </CopyToClipboard>
                        </td>
                        <td className="site-url" width="75%">
                            <a
                                className="grey-text text-darken-1"
                                href={'/api/redirect/' + item.linkName}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {item.originalUrl}
                            </a>
                        </td>
                        <td className="url-hits" width="10%">
                            {(item.urlHits ?? 0).toLocaleString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default PopularYos
