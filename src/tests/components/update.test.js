import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import UpdateModal from '../../components/update'
import { useDashboard } from '../../context/dashboard-context'

jest.mock('../../context/dashboard-context', () => ({
    useDashboard: jest.fn(),
}))
jest.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({ children }) => children,
}))

beforeEach(() => {
    useDashboard.mockReturnValue({
        selectedItem: {
            linkName: 'docs',
            originalUrl: 'https://example.com/docs',
        },
        closeUpdateModal: jest.fn(),
        refreshDashboard: jest.fn(),
        scheduleRefresh: jest.fn(),
    })
    global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) })
    jest.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
    jest.restoreAllMocks()
    delete global.fetch
})

it('does not delete when confirmation is declined', () => {
    render(<UpdateModal />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete docs' }))
    expect(window.confirm).toHaveBeenCalledWith(
        'Delete docs? This cannot be undone.'
    )
    expect(fetch).not.toHaveBeenCalled()
})

it('deletes after confirmation and refreshes the dashboard', async () => {
    window.confirm.mockReturnValue(true)
    render(<UpdateModal />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete docs' }))
    await waitFor(() =>
        expect(screen.getByText('Deleted!')).toBeInTheDocument()
    )
    expect(fetch).toHaveBeenCalledWith(
        '/api/delete',
        expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({ linkName: 'docs' }),
        })
    )
    expect(useDashboard().refreshDashboard).toHaveBeenCalled()
})

it('preserves ordinary update submission', async () => {
    render(<UpdateModal />)
    fireEvent.change(screen.getByLabelText('Website URL'), {
        target: { value: 'https://example.com/guide' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update docs' }))
    await waitFor(() =>
        expect(screen.getByText('Updated!')).toBeInTheDocument()
    )
    expect(fetch).toHaveBeenCalledWith(
        '/api/update',
        expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                linkName: 'docs',
                originalUrl: 'https://example.com/guide',
            }),
        })
    )
})
