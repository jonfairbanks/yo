import { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useDashboardQuery } from '../hooks/use-dashboard-query'

dayjs.extend(relativeTime)

const formatNumber = (value, options = {}) =>
    new Intl.NumberFormat(undefined, options).format(value ?? 0)

const formatShare = (value, total) => {
    if (!total) {
        return 'No links yet'
    }

    return `${Math.round((value / total) * 100)}% of all links`
}

const formatMoment = (value) => {
    if (!value) {
        return 'No activity yet'
    }

    return `${dayjs(value).fromNow()} | ${dayjs(value).format(
        'MMM D, YYYY h:mm A'
    )}`
}

const Stats = () => {
    const queryUrl = useMemo(() => '/api/stats', [])
    const { data, error, loading } = useDashboardQuery({
        fallbackMessage: 'Failed to load data.',
        url: queryUrl,
        initialData: null,
        parse: (json) => json,
    })

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    const totalYos = data?.totalYos ?? 0
    const recentWindowDays = data?.recentWindowDays ?? 30
    const averageHitsPerYo = data?.averageHitsPerYo ?? 0
    const averageHitOptions = Number.isInteger(averageHitsPerYo)
        ? { maximumFractionDigits: 0 }
        : { maximumFractionDigits: 1, minimumFractionDigits: 1 }

    const statTiles = [
        {
            detail: 'All short links currently stored',
            label: 'Total Links',
            value: formatNumber(totalYos),
        },
        {
            detail: 'All-time redirects across every link',
            label: 'Total Redirects',
            value: formatNumber(data?.totalHits),
        },
        {
            detail: 'Average traffic density per short link',
            label: 'Avg Redirects',
            value: formatNumber(averageHitsPerYo, averageHitOptions),
        },
        {
            detail: formatShare(data?.activeYos ?? 0, totalYos),
            label: 'Active Links',
            value: formatNumber(data?.activeYos),
        },
        {
            detail: 'Links that have not been used yet',
            label: 'Unused Links',
            value: formatNumber(data?.unusedYos),
        },
        {
            detail: `Redirected at least once in the last ${recentWindowDays} days`,
            label: `Used in ${recentWindowDays} Days`,
            value: formatNumber(data?.recentlyAccessedYos),
        },
        {
            detail: `Links added in the last ${recentWindowDays} days`,
            label: `New in ${recentWindowDays} Days`,
            value: formatNumber(data?.recentlyCreatedYos),
        },
    ]

    const spotlightCards = [
        {
            detail: data?.popularYo
                ? `${formatNumber(data.popularYo.urlHits)} redirects`
                : 'No redirect history yet',
            label: 'Most Redirected',
            value: data?.popularYo ? `/${data.popularYo.linkName}` : '—',
        },
        {
            detail: formatMoment(data?.newestYo?.createdAt),
            label: 'Newest Link',
            value: data?.newestYo ? `/${data.newestYo.linkName}` : '—',
        },
        {
            detail: formatMoment(data?.latestAccessedYo?.lastAccess),
            label: 'Latest Redirect',
            value: data?.latestAccessedYo
                ? `/${data.latestAccessedYo.linkName}`
                : '—',
        },
    ]

    return (
        <section className="stats-section" aria-label="Link statistics">
            <div className="stats-grid">
                {statTiles.map((tile) => (
                    <article className="stats-card" key={tile.label}>
                        <p className="stats-card-label">{tile.label}</p>
                        <p className="stats-card-value">{tile.value}</p>
                        <p className="stats-card-detail">{tile.detail}</p>
                    </article>
                ))}
            </div>

            <div className="stats-spotlight-grid">
                {spotlightCards.map((card) => (
                    <article className="stats-spotlight-card" key={card.label}>
                        <p className="stats-card-label">{card.label}</p>
                        <p className="stats-spotlight-value">{card.value}</p>
                        <p className="stats-card-detail">{card.detail}</p>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default Stats
