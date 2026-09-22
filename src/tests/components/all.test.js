import React from 'react'
import { act } from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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
            const page = requestUrl.searchParams.get('page')
            const sortDir = requestUrl.searchParams.get('sortDir')
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

            if (page === '2') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        items: [
                            {
                                linkName: 'guides',
                                originalUrl: 'https://example.com/guides',
                                urlHits: 4,
                            },
                        ],
                        pagination: {
                            page: 2,
                            pageSize: 10,
                            totalItems: 11,
                            totalPages: 2,
                        },
                    }),
                })
            }

            if (sortDir === 'desc') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        items: [
                            {
                                linkName: 'zebra',
                                originalUrl: 'https://example.com/zebra',
                                urlHits: 1,
                            },
                        ],
                        pagination: {
                            page: 1,
                            pageSize: 10,
                            totalItems: 11,
                            totalPages: 2,
                        },
                    }),
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
                              totalItems: 11,
                              totalPages: 2,
                          },
                      }

            return Promise.resolve({
                ok: true,
                json: async () => json,
            })
        })
    })

    afterEach(() => {
        act(() => {
            jest.runOnlyPendingTimers()
        })
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

    it('requests a server-sorted page when a sortable header is selected', async () => {
        renderWithProvider(<AllYos />)

        await screen.findByText('docs')
        const initialRequestCount = global.fetch.mock.calls.length

        fireEvent.click(screen.getByRole('columnheader', { name: 'Link' }))

        expect(
            screen.getByRole('columnheader', { name: /Link/ })
        ).toHaveTextContent('⬆')

        fireEvent.click(screen.getByRole('columnheader', { name: /Link/ }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(initialRequestCount + 1)
        })

        const requestUrl = new URL(
            global.fetch.mock.calls.at(-1)[0],
            'http://localhost'
        )
        expect(requestUrl.searchParams.get('sortBy')).toBe('linkName')
        expect(requestUrl.searchParams.get('sortDir')).toBe('desc')
        expect(await screen.findByText('zebra')).toBeInTheDocument()
        expect(
            screen.getByRole('columnheader', { name: /Link/ })
        ).toHaveTextContent('⬇')
    })

    it('requests the next server page and updates pagination controls', async () => {
        renderWithProvider(<AllYos />)

        await screen.findByText('docs')

        fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))

        expect(await screen.findByText('guides')).toBeInTheDocument()
        expect(screen.getByText('Page 2 of 2 (11 links)')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Go to previous page' })
        ).toBeEnabled()
        expect(
            screen.getByRole('button', { name: 'Go to next page' })
        ).toBeDisabled()
    })
})
