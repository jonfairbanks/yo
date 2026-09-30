import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import Stats from '../../components/stats'
import {
    DashboardProvider,
    useDashboard,
} from '../../context/dashboard-context'

const fixture = {
    totalYos: 100,
    totalHits: 20350,
    averageHitsPerYo: 203.5,
    activeYos: 85,
    unusedYos: 15,
    recentWindowDays: 14,
    recentlyAccessedYos: 40,
    recentlyCreatedYos: 12,
    popularYo: { linkName: 'popular', urlHits: 9000 },
    newestYo: { linkName: 'newest', createdAt: '2026-09-29T12:00:00.000Z' },
    latestAccessedYo: {
        linkName: 'latest',
        lastAccess: '2026-09-29T14:00:00.000Z',
    },
}

function FilterState() {
    const { activeTab, tableFilter, isCreateModalOpen } = useDashboard()
    return (
        <div data-testid="dashboard-state">
            {JSON.stringify({ activeTab, tableFilter, isCreateModalOpen })}
        </div>
    )
}

const renderStats = () =>
    render(
        <DashboardProvider>
            <Stats />
            <FilterState />
        </DashboardProvider>
    )
const response = (data, ok = true) => ({ ok, json: async () => data })

beforeEach(() => {
    window.history.replaceState(null, '', '#stats')
    global.fetch = jest.fn().mockResolvedValue(response(fixture))
})

afterEach(() => {
    jest.restoreAllMocks()
    window.history.replaceState(null, '', '/')
})

it('shows aggregate metrics and highlight dates in Pacific time', async () => {
    renderStats()
    expect(await screen.findByText('20,350')).toBeVisible()
    expect(screen.getByText('203.5')).toBeVisible()
    expect(screen.getByText('85% active')).toBeVisible()
    expect(screen.getByText('Last 14 days')).toBeVisible()
    expect(screen.getByText('/popular')).toBeVisible()
    expect(screen.getByText('9,000 redirects')).toBeVisible()
    expect(screen.getByText('Sep 29, 2026, 5:00 AM PDT')).toBeVisible()
    expect(screen.getByText('Sep 29, 2026, 7:00 AM PDT')).toBeVisible()
    expect(
        screen.getByRole('region', { name: 'Link Statistics' })
    ).toHaveAttribute('aria-busy', 'false')
    expect(screen.getAllByRole('button')).toHaveLength(5)
})

it.each([
    ['View All Links', 'all', {}],
    ['View Active Links', 'active', { usage: 'active' }],
    ['View Unused Links', 'unused', { usage: 'unused' }],
    [
        'View Used in 14 Days',
        'recently-accessed',
        { recent: 'accessed', sinceDays: '14' },
    ],
    ['View New in 14 Days', 'new', { recent: 'created', sinceDays: '14' }],
])('opens the correct All filter from %s', async (name, id, params) => {
    renderStats()
    fireEvent.click(await screen.findByRole('button', { name }))
    const state = JSON.parse(screen.getByTestId('dashboard-state').textContent)
    expect(state.activeTab).toBe('all')
    expect(state.tableFilter).toMatchObject({ id, params })
    expect(window.location.hash).toBe('#all')
})

it('provides a create action for an empty collection without invalid percentages', async () => {
    global.fetch.mockResolvedValue(response({}))
    renderStats()
    expect(await screen.findByText('No Links Yet')).toBeVisible()
    expect(screen.getByText('0% active')).toBeVisible()
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create a Link' }))
    expect(
        JSON.parse(screen.getByTestId('dashboard-state').textContent)
            .isCreateModalOpen
    ).toBe(true)
})

it('announces loading without exposing unavailable actions', () => {
    global.fetch.mockReturnValue(new Promise(() => {}))
    renderStats()
    expect(screen.getByRole('status')).toHaveTextContent(
        'Loading statistics...'
    )
    expect(
        screen.getByRole('region', { name: 'Link Statistics' })
    ).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('retries a failed request and shows the recovered statistics', async () => {
    global.fetch
        .mockResolvedValueOnce(
            response({ error: 'Could not load statistics.' }, false)
        )
        .mockResolvedValueOnce(response(fixture))
    renderStats()
    expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not load statistics.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('20,350')).toBeVisible()
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
})
