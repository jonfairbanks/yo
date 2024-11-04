import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CopyToClipboard } from 'react-copy-to-clipboard'

dayjs.extend(relativeTime)

const LatestYos = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch data from API on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/latest')
                const json = await response.json()
                setData(json)
                setLoading(false)
            } catch (error) {
                setError('Failed to load latest data:', error)
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
        <table>
            <thead>
                <tr>
                    <th>Link</th>
                    <th>Site URL</th>
                    <th>Last Access</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td width="15%">
                            <CopyToClipboard
                                text={
                                    window.location.host + '/' + item.linkName
                                }
                            >
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
                        <td width="10%">
                            {dayjs(item.lastAccess).toNow(true)} ago
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default LatestYos
