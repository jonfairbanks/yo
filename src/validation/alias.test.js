import { assertValidOriginalUrl } from './alias'
import { createAlias, updateAlias } from '../services/yo-service'
import * as repository from '../repositories/yo-repository'

jest.mock('../repositories/yo-repository', () => ({
    insertAlias: jest.fn(),
    updateAliasByLinkName: jest.fn(),
}))

jest.mock('../lib/redirect', () => ({ resolveRedirect: jest.fn() }))

jest.mock('../lib/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

describe('destination validation', () => {
    beforeEach(() => jest.clearAllMocks())

    it.each([
        'http://localhost:8080/docs',
        'HTTPS://example.com/docs?next=%2Fteam#section',
        'https://user:password@example.com/docs',
        'http://[::1]:8080/docs',
        'https://example.com/a b',
        'https://example.com/%GG',
    ])('preserves accepted HTTP destinations: %s', async (originalUrl) => {
        expect(() => assertValidOriginalUrl(originalUrl)).not.toThrow()
        repository.insertAlias.mockResolvedValue({
            linkName: 'docs',
            originalUrl,
            shortUrl: 'https://yo.test/docs',
        })
        repository.updateAliasByLinkName.mockResolvedValue({ linkName: 'docs' })
        await createAlias({
            linkName: 'docs',
            originalUrl,
            shortBaseUrl: 'https://yo.test',
        })
        await updateAlias({ linkName: 'docs', originalUrl })
        expect(repository.insertAlias).toHaveBeenCalledWith({
            linkName: 'docs',
            originalUrl,
            shortUrl: 'https://yo.test/docs',
        })
        expect(repository.updateAliasByLinkName).toHaveBeenCalledWith({
            linkName: 'docs',
            originalUrl,
        })
    })

    it.each([
        'javascript:alert(1)',
        'JaVaScRiPt:alert(1)',
        'data:text/html,hello',
        'mailto:user@example.com',
        'ftp://example.com/file',
        '//example.com/docs',
        '/team/docs',
        'https://',
        'http://[invalid]/',
        '',
        '   ',
        ['https://example.com/docs'],
        { originalUrl: 'https://example.com/docs' },
        123,
        null,
        undefined,
    ])(
        'rejects invalid destinations before either write: %p',
        async (originalUrl) => {
            const input = {
                linkName: 'docs',
                originalUrl,
                shortBaseUrl: 'https://yo.test',
            }
            for (const write of [createAlias, updateAlias]) {
                await expect(write(input)).rejects.toMatchObject({
                    statusCode: 400,
                    code: 'invalid_url',
                    message: 'The provided URL is improperly formatted.',
                })
            }
            expect(repository.insertAlias).not.toHaveBeenCalled()
            expect(repository.updateAliasByLinkName).not.toHaveBeenCalled()
        }
    )
})
