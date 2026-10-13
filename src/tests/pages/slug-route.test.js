import logger from '../../lib/logger'
import { addRequestMeta } from 'next/dist/server/request-meta'
import { recordSpanError, withSpan } from '../../lib/tracing'
import * as redirectService from '../../lib/redirect'
import { act, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CatchAllRoute, { getServerSideProps } from '../../pages/[...slug]'

jest.mock('../../lib/redirect', () => ({
    __esModule: true,
    resolveRedirect: jest.fn(),
}))

jest.mock('../../lib/logger', () => ({
    __esModule: true,
    default: { info: jest.fn() },
}))

jest.mock('../../lib/tracing', () => ({
    recordSpanError: jest.fn(),
    withSpan: jest.fn(async (_name, _attributes, callback) => {
        const span = { setAttribute: jest.fn() }
        withSpan.spans.push(span)
        return callback(span)
    }),
}))

describe('/[...slug]', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        withSpan.spans = []
    })

    it('records the browser status once with a normalized alias', async () => {
        const destination =
            'https://example.com/docs?token=private-marker#secret'
        redirectService.resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: destination,
        })
        const context = {
            params: { slug: [' /Docs/ '] },
            req: {},
            res: {},
        }
        await expect(getServerSideProps(context)).resolves.toEqual({
            redirect: { destination, permanent: false },
        })
        expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
            'http.response.status_code',
            307
        )
        expect(logger.info).toHaveBeenCalledTimes(1)
        expect(logger.info).toHaveBeenCalledWith({
            event: 'redirect_success',
            alias: 'docs',
            status: 307,
        })
        expect(JSON.stringify(logger.info.mock.calls)).not.toContain(
            destination
        )
        expect(
            JSON.stringify(withSpan.spans[0].setAttribute.mock.calls)
        ).not.toContain(destination)
    })

    it.each([400, 404, 429, 500])(
        'does not log completion for status %s',
        async (status) => {
            redirectService.resolveRedirect.mockResolvedValue({
                status,
                retryAfter: 1,
            })
            const context = {
                params: { slug: ['docs'] },
                req: {},
                res: { setHeader: jest.fn() },
            }
            await getServerSideProps(context)
            expect(context.res.statusCode).toBe(status)
            expect(logger.info).not.toHaveBeenCalled()
            expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
                'http.response.status_code',
                status
            )
            if (status === 500) expect(recordSpanError).toHaveBeenCalledTimes(1)
        }
    )

    it('records HEAD as the request method', async () => {
        redirectService.resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: 'https://example.com/docs',
        })
        await getServerSideProps({
            params: { slug: ['docs'] },
            req: { method: 'HEAD' },
            res: {},
        })
        expect(withSpan).toHaveBeenCalledWith(
            'GET /[...slug]',
            {
                'http.route': '/[...slug]',
                'http.request.method': 'HEAD',
            },
            expect.any(Function)
        )
    })

    it('records 200 for a validated Next data response', async () => {
        const destination = 'https://example.com/docs'
        redirectService.resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: destination,
        })
        const req = { method: 'GET' }
        addRequestMeta(req, 'isNextDataReq', true)
        await expect(
            getServerSideProps({
                params: { slug: ['docs'] },
                req,
                res: { statusCode: 200 },
            })
        ).resolves.toEqual({ redirect: { destination, permanent: false } })
        expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
            'http.response.status_code',
            200
        )
        expect(logger.info).toHaveBeenCalledWith({
            event: 'redirect_success',
            alias: 'docs',
            status: 200,
        })
    })

    it('does not treat a raw data header as a validated data request', async () => {
        redirectService.resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: 'https://example.com/docs',
        })
        await getServerSideProps({
            params: { slug: ['docs'] },
            req: { headers: { 'x-nextjs-data': '1' } },
            res: { statusCode: 200 },
        })
        expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
            'http.response.status_code',
            307
        )
    })

    it('keeps a successful browser redirect when completion logging fails', async () => {
        const destination = 'https://example.com/docs'
        redirectService.resolveRedirect.mockResolvedValue({
            status: 302,
            targetUrl: destination,
        })
        logger.info.mockImplementationOnce(() => {
            throw new Error('Logger failed')
        })
        const res = { statusCode: 200 }
        await expect(
            getServerSideProps({ params: { slug: ['docs'] }, req: {}, res })
        ).resolves.toEqual({ redirect: { destination, permanent: false } })
        expect(res.statusCode).toBe(200)
        expect(recordSpanError).not.toHaveBeenCalled()
        expect(withSpan.spans[0].setAttribute).toHaveBeenCalledWith(
            'http.response.status_code',
            307
        )
    })

    it('marks unexpected failures without logging completion', async () => {
        const error = new Error('Failure containing private-marker')
        redirectService.resolveRedirect.mockRejectedValue(error)
        const context = { params: { slug: ['docs'] }, req: {}, res: {} }
        await expect(getServerSideProps(context)).resolves.toEqual({
            props: {},
        })
        expect(context.res.statusCode).toBe(500)
        expect(recordSpanError).toHaveBeenCalledWith(withSpan.spans[0], error)
        expect(logger.info).not.toHaveBeenCalled()
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
        screen.getByRole('heading', {
            name: "Yo Dawg, That's a Lot of Requests",
        })
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
