import * as redirectService from '../../lib/redirect'
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CatchAllRoute, { getServerSideProps } from '../../pages/[...slug]'

jest.mock('../../lib/redirect', () => ({
    __esModule: true,
    resolveRedirect: jest.fn(),
}))

describe('/[...slug]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('does not resolve redirects for reserved asset paths', async () => {
        const context = {
            params: {
                slug: ['vendor', 'materialize', 'materialize.min.js'],
            },
            req: {
                headers: {
                    host: 'localhost:3000',
                },
            },
            res: {
                statusCode: 200,
            },
        }

        await expect(getServerSideProps(context)).resolves.toEqual({
            props: {},
        })

        expect(context.res.statusCode).toBe(404)
        expect(redirectService.resolveRedirect).not.toHaveBeenCalled()
    })

    it('returns the overload status and retry header', async () => {
        redirectService.resolveRedirect.mockResolvedValue({
            status: 429,
            retryAfter: 1,
        })
        const context = {
            params: { slug: ['docs'] },
            req: {},
            res: { setHeader: jest.fn() },
        }
        await expect(getServerSideProps(context)).resolves.toEqual({
            props: { rateLimited: true, retryAfter: 1 },
        })
        expect(context.res.statusCode).toBe(429)
        expect(context.res.setHeader).toHaveBeenCalledWith('Retry-After', '1')
        expect(context.res.setHeader).toHaveBeenCalledWith(
            'Cache-Control',
            'private, no-store'
        )
    })
})

it('shows a rate-limit message and enables retry after the wait', () => {
    jest.useFakeTimers()
    render(<CatchAllRoute rateLimited retryAfter={1} />)
    expect(
        screen.getByRole('heading', { name: 'Too Many Requests' })
    ).toBeInTheDocument()
    expect(screen.queryByText(/link doesn't exist/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeDisabled()
    act(() => jest.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeEnabled()
    jest.useRealTimers()
})

it('keeps the missing-link page for ordinary 404s', () => {
    render(<CatchAllRoute />)
    expect(screen.getByText(/link doesn't exist/i)).toBeInTheDocument()
    expect(
        screen.queryByRole('button', { name: 'Try Again' })
    ).not.toBeInTheDocument()
})
