import { useMemo } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { useDashboard } from '../context/dashboard-context'
import { useDashboardQuery } from '../hooks/use-dashboard-query'
import { getShortUrl } from '../lib/browser-short-url'

const PopularYos = () => {
    const { scheduleRefresh } = useDashboard()
    const queryUrl = useMemo(() => '/api/popular', [])
    const { data, error, loading } = useDashboardQuery({
        fallbackMessage: 'Failed to load popular data.',
        url: queryUrl,
        initialData: [],
        parse: (json) => {
            if (!Array.isArray(json)) {
                throw new Error('Failed to load popular data.')
            }

            return json
        },
    })

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
                                href={'/' + item.linkName}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => scheduleRefresh()}
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
