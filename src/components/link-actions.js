import { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortPath, getShortUrl } from '../lib/browser-short-url'

const LinkActions = ({ compact = false, linkName, onVisit }) => {
    const [copied, setCopied] = useState(false)

    const shortPath = getShortPath(linkName)
    const shortUrl = getShortUrl(linkName)
    const buttonClass = compact ? 'btn-small' : 'btn'

    const handleCopied = () => {
        setCopied(true)
        window.setTimeout(() => {
            setCopied(false)
        }, 1500)
    }

    const compactClassName = compact
        ? 'row-actions-grid compact-row-actions'
        : 'table-actions'

    return (
        <div className={compactClassName}>
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
            <CopyToClipboard text={shortUrl} onCopy={handleCopied}>
                <button
                    type="button"
                    className={`${buttonClass} grey grey-text text-darken-3 row-action-button`}
                    aria-label={`Copy ${linkName} short link`}
                >
                    <i className="material-icons row-action-icon">
                        {copied ? 'done' : 'content_copy'}
                    </i>
                    {copied
                        ? compact
                            ? 'Copied'
                            : 'Copied Link'
                        : compact
                          ? 'Copy'
                          : 'Copy Link'}
                </button>
            </CopyToClipboard>
        </div>
    )
}

export default LinkActions
