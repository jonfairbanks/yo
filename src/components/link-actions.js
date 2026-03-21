import { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'

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

    const shortUrl = getShortUrl(linkName)
    const buttonClass = compact ? 'btn-small' : 'btn'

    const handleCopied = (value) => {
        setCopiedState(value)
        window.setTimeout(() => {
            setCopiedState((current) => (current === value ? null : current))
        }, 1500)
    }

    return (
        <div
            className={`table-actions ${compact ? 'compact-actions' : ''} ${className}`.trim()}
        >
            {includeTest ? (
                <a
                    href={shortUrl}
                    className={`${buttonClass} teal white-text icon-left`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onVisit}
                    aria-label={`Test ${linkName} redirect`}
                >
                    <i className="material-icons">open_in_new</i>
                    {compact ? 'Visit' : 'Visit Page'}
                </a>
            ) : null}
            <CopyToClipboard
                text={shortUrl}
                onCopy={() => handleCopied('short')}
            >
                <a
                    className={`${buttonClass} grey grey-text text-darken-3 icon-left`}
                    aria-label={`Copy ${linkName} short link`}
                >
                    <i className="material-icons">
                        {copiedState === 'short' ? 'done' : 'content_copy'}
                    </i>
                    {copiedState === 'short'
                        ? compact
                            ? 'Copied'
                            : 'Copied Link'
                        : compact
                          ? 'Copy'
                          : 'Copy Link'}
                </a>
            </CopyToClipboard>
            {includeCopyDestination && originalUrl ? (
                <CopyToClipboard
                    text={originalUrl}
                    onCopy={() => handleCopied('destination')}
                >
                    <a
                        className={`${buttonClass} grey grey-text text-darken-3 icon-left`}
                        aria-label={`Copy ${linkName} destination URL`}
                    >
                        <i className="material-icons">
                            {copiedState === 'destination'
                                ? 'done'
                                : 'link'}
                        </i>
                        {copiedState === 'destination'
                            ? 'Copied URL'
                            : 'Copy URL'}
                    </a>
                </CopyToClipboard>
            ) : null}
        </div>
    )
}

export default LinkActions
