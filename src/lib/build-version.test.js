/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { readBuildVersion } from './build-version'

jest.mock('node:fs', () => ({ readFileSync: jest.fn() }))

describe('Build Version', () => {
    const originalEnvironment = process.env.NODE_ENV
    afterEach(() => {
        process.env.NODE_ENV = originalEnvironment
    })

    it('reads the artifact identity without trusting runtime release variables', () => {
        readFileSync.mockReturnValue('a'.repeat(40) + '\n')
        expect(readBuildVersion()).toBe('a'.repeat(40))
        expect(readFileSync.mock.calls[0][0]).toBe(
            `${process.cwd()}/.next/BUILD_ID`
        )
    })

    it('accepts the generated Next build ID when Git metadata is unavailable', () => {
        readFileSync.mockReturnValue('build_ABC-123')
        expect(readBuildVersion()).toBe('build_ABC-123')
    })

    it('reports an unknown production version if the artifact file is missing', () => {
        process.env.NODE_ENV = 'production'
        readFileSync.mockImplementation(() => {
            throw new Error('Missing build artifact')
        })
        expect(readBuildVersion()).toBe('unknown')
    })

    it('does not export invalid file contents', () => {
        process.env.NODE_ENV = 'production'
        readFileSync.mockReturnValue('invalid/secret?token=value')
        expect(readBuildVersion()).toBe('unknown')
    })

    it('identifies development runs without a build', () => {
        process.env.NODE_ENV = 'development'
        readFileSync.mockImplementation(() => {
            throw new Error('Missing build artifact')
        })
        expect(readBuildVersion()).toBe('development')
    })
})
