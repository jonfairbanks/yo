import React from 'react'
import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import Tabs from '../../components/tabs'
import {
    DashboardProvider,
    useDashboard,
} from '../../context/dashboard-context'

jest.mock(
    '../../components/all',
    () =>
        function AllPanel() {
            const { tableFilter } = useDashboard()
            return <p>All View: {tableFilter.label}</p>
        }
)
jest.mock(
    '../../components/popular',
    () =>
        function PopularPanel() {
            return <p>Popular View</p>
        }
)
jest.mock(
    '../../components/latest',
    () =>
        function LatestPanel() {
            return <p>Latest View</p>
        }
)
jest.mock(
    '../../components/stats',
    () =>
        function StatsPanel() {
            const { applyTableFilter } = useDashboard()
            return (
                <button
                    onClick={() =>
                        applyTableFilter({
                            id: 'unused',
                            label: 'Unused Links',
                            params: { unused: true },
                        })
                    }
                >
                    Show Unused Links
                </button>
            )
        }
)
jest.mock('../../components/create', () => () => null)
jest.mock('../../components/update', () => () => null)

const renderTabs = () =>
    render(
        <DashboardProvider>
            <Tabs />
        </DashboardProvider>
    )

describe('Dashboard tabs', () => {
    beforeEach(() => {
        window.history.replaceState({ preview: 'retained' }, '', '/')
    })

    afterEach(() => {
        window.history.replaceState(null, '', '/')
    })

    it('switches panels and cancels native anchor scrolling while preserving history state', () => {
        renderTabs()
        const latestTab = screen.getByRole('tab', { name: 'Latest links tab' })
        expect(fireEvent.click(latestTab)).toBe(false)
        expect(latestTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('Latest View')).toBeVisible()
        expect(screen.getByText('All View: All links')).not.toBeVisible()
        expect(window.location.hash).toBe('#latest')
        expect(window.history.state).toEqual({ preview: 'retained' })

        const allTab = screen.getByRole('tab', { name: 'All links tab' })
        expect(fireEvent.click(allTab)).toBe(false)
        expect(allTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('All View: All links')).toBeVisible()
        expect(screen.getByText('Latest View')).not.toBeVisible()
        expect(window.location.hash).toBe('#all')

        const historyLength = window.history.length
        fireEvent.click(allTab)
        expect(window.history.length).toBe(historyLength)
    })

    it.each([
        ['#popular', 'Popular links tab', 'Popular View'],
        ['#latest', 'Latest links tab', 'Latest View'],
        ['#stats', 'Stats tab', 'Show Unused Links'],
        ['#unknown', 'All links tab', 'All View: All links'],
    ])(
        'restores the correct view on a load with %s',
        (hash, tabLabel, text) => {
            window.history.replaceState(null, '', hash)
            renderTabs()
            expect(screen.getByRole('tab', { name: tabLabel })).toHaveAttribute(
                'aria-selected',
                'true'
            )
            expect(screen.getByText(text)).toBeVisible()
        }
    )

    it('follows Back/Forward and fragment changes', () => {
        renderTabs()
        fireEvent.click(screen.getByRole('tab', { name: 'Stats tab' }))

        act(() => {
            window.history.replaceState(null, '', '#latest')
            window.dispatchEvent(new PopStateEvent('popstate'))
        })
        expect(
            screen.getByRole('tab', { name: 'Latest links tab' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('Latest View')).toBeVisible()

        act(() => {
            window.history.replaceState(null, '', '#stats')
            window.dispatchEvent(new PopStateEvent('popstate'))
        })
        expect(screen.getByRole('tab', { name: 'Stats tab' })).toHaveAttribute(
            'aria-selected',
            'true'
        )

        act(() => {
            window.history.replaceState(null, '', '#popular')
            window.dispatchEvent(new HashChangeEvent('hashchange'))
        })
        expect(
            screen.getByRole('tab', { name: 'Popular links tab' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('Popular View')).toBeVisible()
    })

    it('shows the requested Stats filter in All without scrolling', () => {
        const scrollIntoView = jest.fn()
        renderTabs()
        document.getElementById('all').scrollIntoView = scrollIntoView
        fireEvent.click(screen.getByRole('tab', { name: 'Stats tab' }))
        fireEvent.click(
            screen.getByRole('button', { name: 'Show Unused Links' })
        )
        expect(
            screen.getByRole('tab', { name: 'All links tab' })
        ).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByText('All View: Unused Links')).toBeVisible()
        expect(window.location.hash).toBe('#all')
        expect(scrollIntoView).not.toHaveBeenCalled()
    })
})
