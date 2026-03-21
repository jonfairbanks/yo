import { getReservedPathMatch, isReservedPath } from './reserved-routes'

describe('reserved routes', () => {
    it('does not treat normal aliases as reserved', () => {
        expect(getReservedPathMatch('adsb')).toBeUndefined()
        expect(isReservedPath('adsb')).toBe(false)
        expect(isReservedPath('docs')).toBe(false)
    })

    it('matches exact reserved routes', () => {
        expect(getReservedPathMatch('api')).toBe('api')
        expect(isReservedPath('robots.txt')).toBe(true)
    })

    it('matches reserved route prefixes', () => {
        expect(getReservedPathMatch('vendor/materialize/materialize.min.js')).toBe(
            'vendor/'
        )
        expect(getReservedPathMatch('images/apple-touch-icon.png')).toBe(
            'images/'
        )
    })
})
