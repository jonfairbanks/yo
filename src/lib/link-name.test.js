import { normalizeLinkName } from './link-name'

describe('normalizeLinkName', () => {
    it('returns an empty string for non-string values', () => {
        expect(normalizeLinkName()).toBe('')
        expect(normalizeLinkName(null)).toBe('')
        expect(normalizeLinkName(42)).toBe('')
    })

    it('trims whitespace, strips edge slashes, and lowercases', () => {
        expect(normalizeLinkName(' /Docs/ ')).toBe('docs')
        expect(normalizeLinkName('///Team/Guides///')).toBe('team/guides')
    })

    it('returns an empty string when the value only contains slashes', () => {
        expect(normalizeLinkName(' /// ')).toBe('')
        expect(normalizeLinkName('////')).toBe('')
    })
})
