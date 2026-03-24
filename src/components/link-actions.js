import { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortPath, getShortUrl } from '../lib/browser-short-url'

const LinkActions = ({
    compact = false,
    className = '',
    includeCopyDestination = true,
    includeTest = true,
    linkName,
    onVisit,
    originalUrl,
}) => {
    const [copiedState, setCopiedState] = useState(null)

    const shortPath = getShortPath(linkName)
    const shortUrl = getShortUrl(linkName)
    const buttonClass = compact ? 'btn-small' : 'btn'

    const handleCopied = (value) => {
        setCopiedState(value)
        window.setTimeout(() => {
            setCopiedState((current) => (current === value ? null : current))
        }, 1500)
    }

    const compactClassName = compact
        ? 'row-actions-grid compact-row-actions'
        : `table-actions ${className}`.trim()

    return (
        <div className={compactClassName}>
            {includeTest ? (
                <a
                    href={shortPath}
                    className={`${buttonClass} teal white-text row-action-button`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onVisit}
                    aria-label={`Test ${linkName} redirect`}
                >
                    <i className="material-icons row-action-icon">
                        open_in_new
                    </i>
                    {compact ? 'Visit' : 'Visit Page'}
                </a>
            ) : null}
            <CopyToClipboard
                text={shortUrl}
                onCopy={() => handleCopied('short')}
            >
                <button
                    type="button"
                    className={`${buttonClass} grey grey-text text-darken-3 row-action-button`}
                    aria-label={`Copy ${linkName} short link`}
                >
                    <i className="material-icons row-action-icon">
                        {copiedState === 'short' ? 'done' : 'content_copy'}
                    </i>
                    {copiedState === 'short'
                        ? compact
                            ? 'Copied'
                            : 'Copied Link'
                        : compact
                          ? 'Copy'
                          : 'Copy Link'}
                </button>
            </CopyToClipboard>
            {/* Temporarily hide Copy URL until we revisit that action. */}
            {false && includeCopyDestination && originalUrl ? (
                <CopyToClipboard
                    text={originalUrl}
                    onCopy={() => handleCopied('destination')}
                >
                    <button
                        type="button"
                        className={`${buttonClass} grey grey-text text-darken-3 row-action-button`}
                        aria-label={`Copy ${linkName} destination URL`}
                    >
                        <i className="material-icons row-action-icon">
                            {copiedState === 'destination' ? 'done' : 'link'}
                        </i>
                        {copiedState === 'destination'
                            ? 'Copied URL'
                            : 'Copy URL'}
                    </button>
                </CopyToClipboard>
            ) : null}
        </div>
    )
}

export default LinkActions
