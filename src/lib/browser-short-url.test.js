import { getShortPath } from './browser-short-url'

describe('browser-short-url', () => {
    it('encodes unsafe characters in a single-segment short path', () => {
        expect(getShortPath('docs<script>alert(1)</script>')).toBe(
            '/docs%3Cscript%3Ealert(1)%3C/script%3E'
        )
    })

    it('preserves nested path structure while encoding each segment', () => {
        expect(getShortPath('team docs/hello world')).toBe(
            '/team%20docs/hello%20world'
        )
    })
})
