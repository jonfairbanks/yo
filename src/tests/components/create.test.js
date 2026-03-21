import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import CreateModal from '../../components/create'
import { DashboardProvider } from '../../context/dashboard-context'

jest.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({ children }) => children,
}))

describe('CreateModal', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                linkName: 'docs',
                originalUrl: 'https://example.com/docs',
            }),
        })
    })

    afterEach(() => {
        delete global.fetch
    })

    it('links to the short URL after a successful create', async () => {
        const { container } = render(
            <DashboardProvider>
                <CreateModal onClose={() => {}} />
            </DashboardProvider>
        )

        const linkNameInput = screen.getByLabelText('Link name')
        const originalUrlInput = screen.getByLabelText('Website URL')

        fireEvent.change(linkNameInput, {
            target: { value: 'docs' },
        })
        fireEvent.change(originalUrlInput, {
            target: { value: 'https://example.com/docs' },
        })

        const form = container.querySelector('form')
        Object.defineProperty(form, 'linkName', {
            configurable: true,
            value: linkNameInput,
        })
        Object.defineProperty(form, 'originalUrl', {
            configurable: true,
            value: originalUrlInput,
        })

        fireEvent.submit(form)

        const visitLink = await screen.findByRole('link', {
            name: 'Visit docs redirect',
        })

        expect(visitLink).toHaveAttribute('href', 'http://localhost/docs')
    })
})
