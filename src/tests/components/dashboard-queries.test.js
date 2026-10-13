import React from 'react'
import { renderToString } from 'react-dom/server'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import Tabs from '../../components/tabs'
import {
    DashboardProvider,
    useDashboard,
} from '../../context/dashboard-context'

jest.mock('../../components/create', () => () => null)
jest.mock('../../components/update', () => () => null)
jest.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({ children }) => children,
}))

const allData = {
    items: [{ linkName: 'docs', originalUrl: 'https://example.com/docs' }],
    pagination: { totalItems: 11, totalPages: 2 },
}
const response = (data) => ({ ok: true, json: async () => data })

function Refresh() {
    const { refreshDashboard } = useDashboard()
    return <button onClick={refreshDashboard}>Refresh Dashboard</button>
}

const renderDashboard = () =>
    render(
        <DashboardProvider>
            <Tabs />
            <Refresh />
        </DashboardProvider>
    )

beforeEach(() => {
    window.history.replaceState(null, '', '/')
    global.fetch = jest.fn((url) =>
        Promise.resolve(
            response(
                url.startsWith('/api?')
                    ? allData
                    : url === '/api/stats'
                      ? {}
                      : []
            )
        )
    )
})

afterEach(() => {
    window.history.replaceState(null, '', '/')
    delete global.fetch
})

it('requests only the active panel at startup, on refresh, and after switching', async () => {
    renderDashboard()
    await screen.findByText('docs')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch.mock.calls[0][0]).toMatch(/^\/api\?/)

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Dashboard' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('tab', { name: 'Popular links tab' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3))
    expect(global.fetch.mock.calls[2][0]).toBe('/api/popular')

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Dashboard' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4))
    expect(global.fetch.mock.calls[3][0]).toBe('/api/popular')
    fireEvent.click(screen.getByRole('tab', { name: 'All links tab' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5))
    expect(global.fetch.mock.calls[4][0]).toMatch(/^\/api\?/)
})

it.each([
    ['#popular', '/api/popular'],
    ['#latest', '/api/latest'],
    ['#stats', '/api/stats'],
])('only requests the selected panel when loading %s', async (hash, url) => {
    window.history.replaceState(null, '', hash)
    renderDashboard()
    await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(url, expect.any(Object))
    )
    expect(global.fetch).toHaveBeenCalledTimes(1)
})

it('retains All search, sort, page, and rows while refreshing after activation', async () => {
    renderDashboard()
    await screen.findByText('docs')
    fireEvent.change(screen.getByLabelText('Filter links'), {
        target: { value: 'docs' },
    })
    await waitFor(() =>
        expect(global.fetch.mock.calls.at(-1)[0]).toContain('q=docs')
    )
    fireEvent.click(screen.getByRole('columnheader', { name: 'Link' }))
    fireEvent.click(screen.getByRole('columnheader', { name: /Link/ }))
    await waitFor(() =>
        expect(global.fetch.mock.calls.at(-1)[0]).toContain('sortDir=desc')
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
    await waitFor(() =>
        expect(global.fetch.mock.calls.at(-1)[0]).toContain('page=2')
    )
    await waitFor(() =>
        expect(
            screen.queryByText('Refreshing results...')
        ).not.toBeInTheDocument()
    )
    const lastAllUrl = global.fetch.mock.calls.at(-1)[0]

    fireEvent.click(screen.getByRole('tab', { name: 'Latest links tab' }))
    await waitFor(() =>
        expect(global.fetch.mock.calls.at(-1)[0]).toBe('/api/latest')
    )
    global.fetch.mockImplementationOnce(() => new Promise(() => {}))
    fireEvent.click(screen.getByRole('tab', { name: 'All links tab' }))

    expect(global.fetch.mock.calls.at(-1)[0]).toBe(lastAllUrl)
    expect(screen.getByLabelText('Filter links')).toHaveValue('docs')
    expect(
        screen.getByRole('columnheader', { name: /Link/ })
    ).toHaveTextContent('⬇')
    expect(screen.getByText('Page 2 of 2 (11 links)')).toBeVisible()
    expect(screen.getByText('docs')).toBeVisible()
    expect(screen.getByText('Refreshing results...')).toBeVisible()
})

it('aborts an inactive request and ignores its late response', async () => {
    let finishOldRequest
    global.fetch.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finishOldRequest = resolve
            })
    )
    renderDashboard()
    const signal = global.fetch.mock.calls[0][1].signal
    expect(screen.getByText('Loading...')).toBeVisible()
    expect(screen.queryByText('No links yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('Refreshing results...')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Latest links tab' }))
    expect(signal.aborted).toBe(true)
    await act(async () =>
        finishOldRequest(
            response({
                ...allData,
                items: [
                    {
                        linkName: 'stale',
                        originalUrl: 'https://example.com/stale',
                    },
                ],
            })
        )
    )
    expect(screen.queryByText('stale')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'All links tab' }))
    expect(await screen.findByText('docs')).toBeVisible()
    expect(global.fetch).toHaveBeenCalledTimes(3)
})

it('shows the first request error without an empty state', async () => {
    global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Could not load links.' }),
    })
    renderDashboard()
    expect(await screen.findByText('Could not load links.')).toBeVisible()
    expect(screen.queryByText('No links yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
})

it('renders initial All loading before client effects run', () => {
    const html = renderToString(
        <DashboardProvider>
            <Tabs />
        </DashboardProvider>
    )
    expect(html).toContain('Loading...')
    expect(html).not.toContain('No links yet.')
    expect(html).not.toContain('Refreshing results...')
    expect(global.fetch).not.toHaveBeenCalled()
})
