import { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useDashboard } from '../context/dashboard-context'
import { useDashboardQuery } from '../hooks/use-dashboard-query'
import LinkActions from './link-actions'

dayjs.extend(relativeTime)

const LatestYos = () => {
    const { scheduleRefresh } = useDashboard()
    const queryUrl = useMemo(() => '/api/latest', [])
    const { data, error, loading } = useDashboardQuery({
        fallbackMessage: 'Failed to load latest data.',
        url: queryUrl,
        initialData: [],
        parse: (json) => {
            if (!Array.isArray(json)) {
                throw new Error('Failed to load latest data.')
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
                    <th>Last Access</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td width="15%">
                            <pre style={{ cursor: 'pointer' }}>
                                {item.linkName}
                            </pre>
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
                        <td width="10%">
                            {dayjs(item.lastAccess).toNow(true)} ago
                        </td>
                        <td width="20%">
                            <LinkActions
                                compact
                                linkName={item.linkName}
                                originalUrl={item.originalUrl}
                                onVisit={() => scheduleRefresh()}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default LatestYos
