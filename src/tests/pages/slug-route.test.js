import * as redirectService from '../../lib/redirect'
import { getServerSideProps } from '../../pages/[...slug]'

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

})
