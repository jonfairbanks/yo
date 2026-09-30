import { useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { useDashboard } from '../context/dashboard-context'
import { useDashboardQuery } from '../hooks/use-dashboard-query'

dayjs.extend(relativeTime)

const formatNumber = (value, options = {}) =>
    new Intl.NumberFormat(undefined, options).format(value ?? 0)

const formatMoment = (value) => {
    if (!value) return 'No activity yet'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'No activity yet'

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles',
        timeZoneName: 'short',
    }).format(date)
}

const Arrow = () => (
    <svg
        className="stats-arrow"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
    >
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
)

const Stats = () => {
    const { applyTableFilter, openCreateModal, refreshDashboard } =
        useDashboard()
    const queryUrl = useMemo(() => '/api/stats', [])
    const { data, error, loading } = useDashboardQuery({
        fallbackMessage: 'Could not load statistics.',
        url: queryUrl,
        initialData: null,
        parse: (json) => json,
    })

    const totalYos = data?.totalYos ?? 0
    const activeYos = data?.activeYos ?? 0
    const activeShare = totalYos
        ? Math.min(100, Math.max(0, (activeYos / totalYos) * 100))
        : 0
    const recentWindowDays = data?.recentWindowDays ?? 30
    const averageHitsPerYo = data?.averageHitsPerYo ?? 0
    const averageHitOptions = Number.isInteger(averageHitsPerYo)
        ? { maximumFractionDigits: 0 }
        : { maximumFractionDigits: 1, minimumFractionDigits: 1 }
    const filterLinks = (id, label, params) =>
        applyTableFilter({ id, label, params })

    const recentMetrics = [
        {
            id: 'recently-accessed',
            label: 'Links Used',
            detail: 'Redirected at least once',
            value: data?.recentlyAccessedYos ?? 0,
            filterLabel: `Used in ${recentWindowDays} Days`,
            recent: 'accessed',
        },
        {
            id: 'new',
            label: 'Links Created',
            detail: 'Added to your collection',
            value: data?.recentlyCreatedYos ?? 0,
            filterLabel: `New in ${recentWindowDays} Days`,
            recent: 'created',
        },
    ]
    const spotlights = [
        {
            label: 'Most Redirected',
            link: data?.popularYo,
            detail: data?.popularYo
                ? `${formatNumber(data.popularYo.urlHits)} redirects`
                : 'No redirect history yet',
        },
        {
            label: 'Newest Link',
            link: data?.newestYo,
            timestamp: data?.newestYo?.createdAt,
        },
        {
            label: 'Latest Redirect',
            link: data?.latestAccessedYo,
            timestamp: data?.latestAccessedYo?.lastAccess,
        },
    ]

    return (
        <section
            className="stats-section"
            aria-labelledby="stats-heading"
            aria-busy={loading}
        >
            <header className="stats-header">
                <h1 id="stats-heading">Link Statistics</h1>
                <span className="stats-scope">All Time</span>
            </header>
            {loading ? (
                <div className="stats-loading" role="status">
                    <p>Loading statistics...</p>
                    <div className="stats-skeleton" aria-hidden="true" />
                    <div
                        className="stats-skeleton stats-skeleton-short"
                        aria-hidden="true"
                    />
                </div>
            ) : error ? (
                <div className="stats-state">
                    <h2>Statistics Unavailable</h2>
                    <p role="alert">{error}</p>
                    <button
                        className="stats-text-action"
                        type="button"
                        onClick={refreshDashboard}
                    >
                        Try Again <Arrow />
                    </button>
                </div>
            ) : (
                <div className="stats-content">
                    <div className="stats-overview">
                        <div className="stats-primary-metric">
                            <p className="stats-label">Total Redirects</p>
                            <p className="stats-primary-value">
                                {formatNumber(data?.totalHits)}
                            </p>
                            <p className="stats-detail">
                                Across all short links
                            </p>
                        </div>
                        <div className="stats-summary">
                            <button
                                className="stats-summary-link stats-interactive"
                                type="button"
                                aria-label="View All Links"
                                onClick={() =>
                                    filterLinks('all', 'All Links', {})
                                }
                            >
                                <span className="stats-label">
                                    Total Links <Arrow />
                                </span>
                                <span className="stats-summary-value">
                                    {formatNumber(totalYos)}
                                </span>
                                <span className="stats-detail">
                                    In your collection
                                </span>
                            </button>
                            <div className="stats-average">
                                <p className="stats-label">
                                    Redirects per Link
                                </p>
                                <p className="stats-summary-value">
                                    {formatNumber(
                                        averageHitsPerYo,
                                        averageHitOptions
                                    )}
                                </p>
                                <p className="stats-detail">All-time average</p>
                            </div>
                        </div>
                    </div>
                    {totalYos === 0 ? (
                        <div className="stats-empty">
                            <div>
                                <h2>No Links Yet</h2>
                                <p className="stats-detail">
                                    Create a short link to start tracking
                                    redirects.
                                </p>
                            </div>
                            <button
                                className="stats-text-action"
                                type="button"
                                onClick={openCreateModal}
                            >
                                Create a Link <Arrow />
                            </button>
                        </div>
                    ) : null}
                    <div className="stats-breakdown">
                        <section
                            className="stats-usage"
                            aria-labelledby="stats-usage-heading"
                        >
                            <div className="stats-section-heading">
                                <h2 id="stats-usage-heading">Link Usage</h2>
                                <span className="stats-detail">
                                    {Math.round(activeShare)}% active
                                </span>
                            </div>
                            <div
                                className="stats-usage-track"
                                aria-hidden="true"
                            >
                                <div
                                    className="stats-usage-fill"
                                    style={{ width: `${activeShare}%` }}
                                />
                            </div>
                            <div className="stats-usage-metrics">
                                <button
                                    className="stats-usage-link stats-interactive"
                                    type="button"
                                    aria-label="View Active Links"
                                    onClick={() =>
                                        filterLinks('active', 'Active Links', {
                                            usage: 'active',
                                        })
                                    }
                                >
                                    <span className="stats-label">
                                        <span className="stats-dot" />
                                        Active Links <Arrow />
                                    </span>
                                    <span className="stats-summary-value">
                                        {formatNumber(activeYos)}
                                    </span>
                                    <span className="stats-detail">
                                        Used at least once
                                    </span>
                                </button>
                                <button
                                    className="stats-usage-link stats-interactive"
                                    type="button"
                                    aria-label="View Unused Links"
                                    onClick={() =>
                                        filterLinks('unused', 'Unused Links', {
                                            usage: 'unused',
                                        })
                                    }
                                >
                                    <span className="stats-label">
                                        <span className="stats-dot stats-dot-unused" />
                                        Unused Links <Arrow />
                                    </span>
                                    <span className="stats-summary-value">
                                        {formatNumber(data?.unusedYos)}
                                    </span>
                                    <span className="stats-detail">
                                        No redirects yet
                                    </span>
                                </button>
                            </div>
                        </section>
                        <section
                            className="stats-recent"
                            aria-labelledby="stats-recent-heading"
                        >
                            <div className="stats-section-heading">
                                <h2 id="stats-recent-heading">
                                    Recent Activity
                                </h2>
                                <span className="stats-detail">
                                    Last {recentWindowDays} days
                                </span>
                            </div>
                            {recentMetrics.map((metric) => (
                                <button
                                    className="stats-recent-link stats-interactive"
                                    type="button"
                                    key={metric.id}
                                    aria-label={`View ${metric.filterLabel}`}
                                    onClick={() =>
                                        filterLinks(
                                            metric.id,
                                            metric.filterLabel,
                                            {
                                                recent: metric.recent,
                                                sinceDays:
                                                    String(recentWindowDays),
                                            }
                                        )
                                    }
                                >
                                    <span>
                                        <span className="stats-label">
                                            {metric.label}
                                        </span>
                                        <span className="stats-detail">
                                            {metric.detail}
                                        </span>
                                    </span>
                                    <span className="stats-recent-value">
                                        {formatNumber(metric.value)}
                                    </span>
                                    <Arrow />
                                </button>
                            ))}
                        </section>
                    </div>
                    <section
                        className="stats-spotlights"
                        aria-labelledby="stats-spotlights-heading"
                    >
                        <h2 id="stats-spotlights-heading">Link Highlights</h2>
                        <div className="stats-spotlight-list">
                            {spotlights.map((item) => (
                                <article
                                    className="stats-spotlight"
                                    key={item.label}
                                >
                                    <h3 className="stats-label">
                                        {item.label}
                                    </h3>
                                    <p className="stats-link-name">
                                        {item.link
                                            ? `/${item.link.linkName}`
                                            : 'None Yet'}
                                    </p>
                                    <p className="stats-detail">
                                        {item.detail ||
                                            (item.timestamp
                                                ? dayjs(
                                                      item.timestamp
                                                  ).fromNow()
                                                : 'No activity yet')}
                                    </p>
                                    {item.timestamp ? (
                                        <p className="stats-timestamp">
                                            {formatMoment(item.timestamp)}
                                        </p>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </section>
    )
}

export default Stats
