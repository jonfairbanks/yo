import React from 'react'
import { act } from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import AllYos from '../../components/all'
import { DashboardProvider } from '../../context/dashboard-context'

jest.mock('../../components/update', () => () => null)

jest.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({ children }) => children,
}))

describe('AllYos', () => {
    let resolvePendingSearch

    const renderWithProvider = (ui) =>
        render(<DashboardProvider>{ui}</DashboardProvider>)

    beforeEach(() => {
        jest.useFakeTimers()
        global.fetch = jest.fn((url) => {
            const requestUrl = new URL(url, 'http://localhost')
            const query = requestUrl.searchParams.get('q')
            if (query === 'thislin') {
                return new Promise((resolve) => {
                    resolvePendingSearch = () =>
                        resolve({
                            ok: true,
                            json: async () => ({
                                items: [],
                                pagination: {
                                    page: 1,
                                    pageSize: 10,
                                    totalItems: 0,
                                    totalPages: 1,
                                },
                            }),
                        })
                })
            }

            const json =
                query === 'thislinkdoesnotexist'
                    ? {
                          items: [],
                          pagination: {
                              page: 1,
                              pageSize: 10,
                              totalItems: 0,
                              totalPages: 1,
                          },
                      }
                    : {
                          items: [
                              {
                                  linkName: 'docs',
                                  originalUrl: 'https://example.com/docs',
                                  urlHits: 12,
                              },
                          ],
                          pagination: {
                              page: 1,
                              pageSize: 10,
                              totalItems: 1,
                              totalPages: 1,
                          },
                      }

            return Promise.resolve({
                ok: true,
                json: async () => json,
            })
        })
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
        delete global.fetch
    })

    it('renders a placeholder row when a search has no matches', async () => {
        renderWithProvider(<AllYos />)

        await screen.findByText('docs')

        fireEvent.change(screen.getByLabelText('Filter links'), {
            target: { value: 'thislinkdoesnotexist' },
        })

        act(() => {
            jest.advanceTimersByTime(300)
        })

        const emptyState = await screen.findByText('No links match this view.')

        expect(emptyState).toBeInTheDocument()
        expect(screen.queryByText('docs')).not.toBeInTheDocument()
    })

    it('keeps focus in the search box while a search request is in flight', async () => {
        renderWithProvider(<AllYos />)

        await screen.findByText('docs')

        const searchInput = screen.getByLabelText('Filter links')
        searchInput.focus()

        fireEvent.change(searchInput, {
            target: { value: 'thislin' },
        })

        act(() => {
            jest.advanceTimersByTime(300)
        })

        expect(searchInput).toHaveFocus()

        await act(async () => {
            resolvePendingSearch()
        })

        expect(screen.getByLabelText('Filter links')).toHaveFocus()
    })
})
