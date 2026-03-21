import React, { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'

const UpdateModal = ({ item, onClose }) => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const [originalUrl, setOriginalUrl] = useState('')
    const [clickedCopy, setClickedCopy] = useState(null)

    useEffect(() => {
        if (item) {
            setOriginalUrl(item.originalUrl || '')
        }
    }, [item])

    useEffect(() => {
        const M = require('@materializecss/materialize') // eslint-disable-line @typescript-eslint/no-require-imports
        const elem = document.getElementById('update')
        const instance = M.Modal.init(elem, {
            dismissible: true,
            onOpenStart: () => {
                elem?.querySelector('input:not([disabled])')?.focus()
            },
            onCloseEnd: () => {
                if (onClose) onClose()
                setSuccess(false) // Reset the state when the Modal closes
                setDeleted(false) // Reset the state when the Modal closes
            },
        })

        const trapFocus = (event) => {
            if (event.key !== 'Tab') return
            const focusable = Array.from(
                elem.querySelectorAll(
                    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
                )
            ).filter(
                (el) =>
                    !el.hasAttribute('disabled') &&
                    el.getAttribute('tabindex') !== '-1' &&
                    el.offsetParent !== null
            )
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        elem?.addEventListener('keydown', trapFocus)
        instance.open()

        return () => {
            elem?.removeEventListener('keydown', trapFocus)
            instance.destroy()
        }
    }, [onClose])

    const UpdateYo = async (event) => {
        event.preventDefault() // Prevent page reload

        // Show a confirmation dialog before updating
        const confirmed = window.confirm(
            'Are you sure you want to update this link?'
        )
        if (!confirmed) return // Exit if user cancels

        const data = {
            linkName: item.linkName,
            originalUrl,
        }

        setSuccess(false)
        setError(null)

        try {
            const response = await fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Unknown error occurred')
            }

            await response.json()
            setSuccess(true)
        } catch (error) {
            setError(error.message)
        }
    }

    const DeleteYo = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this link?'
        )
        if (!confirmed) return

        const data = { linkName: item.linkName }

        try {
            const response = await fetch(`/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error('Failed to delete item')
            setDeleted(true)
        } catch {
            setError('Error deleting item')
        }
    }

    const handleButtonClick = () => {
        setClickedCopy(true)
        setTimeout(() => setClickedCopy(false), 2500) // Reset `clickedCopy` after N seconds
    }

    return (
        <form className="row" onSubmit={UpdateYo}>
            <div
                id="update"
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="update-modal-title"
            >
                <div className="modal-content">
                    <a
                        href="#!"
                        className="modal-close grey-text text-darken-1"
                        aria-label="Close update modal"
                        style={{ float: 'right' }}
                    >
                        <i className="material-icons">close</i>
                    </a>
                    {success ? (
                        <div>
                            <h1
                                id="update-modal-title"
                                className="success-text teal-text"
                            >
                                Updated!
                            </h1>
                            <p className="success-subtext grey-text">
                                <span style={{ float: 'left' }}>The</span>
                                <pre
                                    style={{
                                        float: 'left',
                                        marginLeft: '5px',
                                        marginRight: '5px',
                                    }}
                                >
                                    {item.linkName}
                                </pre>
                                <span>Yo link has been updated</span>
                            </p>
                            <pre style={{ float: 'left' }}>
                                {getShortUrl(item.linkName)}
                            </pre>
                            <i
                                style={{ float: 'left' }}
                                className="material-icons grey-text"
                            >
                                arrow_right_alt
                            </i>
                            <pre>{originalUrl}</pre>
                            <br />
                            <a
                                href={`/${item.linkName}`}
                                className="success-link-btn btn teal white-text icon-left"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="material-icons">redo</i> Go to
                                Link
                            </a>
                            {clickedCopy ? (
                                <a
                                    href="#"
                                    className="btn grey grey-text text-darken-3 icon-left"
                                >
                                    <i className="material-icons teal-text text-darken-1">
                                        done
                                    </i>{' '}
                                    Copied
                                </a>
                            ) : (
                                <CopyToClipboard text={getShortUrl(item.linkName)}>
                                    <a
                                        href="#"
                                        onClick={handleButtonClick}
                                        className="btn grey grey-text text-darken-3 icon-left"
                                    >
                                        <i className="material-icons">
                                            content_copy
                                        </i>{' '}
                                        Copy Link
                                    </a>
                                </CopyToClipboard>
                            )}
                        </div>
                    ) : deleted ? (
                        <div>
                            <h1 className="success-text red-text">Deleted!</h1>
                            <p className="success-subtext grey-text">
                                <span style={{ float: 'left' }}>The</span>
                                <pre
                                    style={{
                                        float: 'left',
                                        marginLeft: '5px',
                                        marginRight: '5px',
                                    }}
                                >
                                    {item.linkName}
                                </pre>
                                <span>Yo link has been deleted!</span>
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h4>Update Link</h4>
                            <div className="s12 m6 input-field">
                                <input
                                    id="linkName"
                                    type="text"
                                    value={item.linkName}
                                    placeholder="rick"
                                    maxLength="120"
                                    disabled
                                    aria-label="Link name"
                                />
                                <label htmlFor="linkName">Link Name</label>
                                <span className="supporting-text">
                                    Name of link to update
                                </span>
                            </div>
                            <br />
                            <br />
                            <div className="s12 m6 input-field">
                                <input
                                    id="originalUrl"
                                    type="url"
                                    value={originalUrl}
                                    onChange={(e) =>
                                        setOriginalUrl(e.target.value)
                                    }
                                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                    required
                                    aria-label="Website URL"
                                />
                                <label htmlFor="originalUrl">Website URL</label>
                                <span className="supporting-text">
                                    What is the URL you want to redirect users
                                    to?
                                </span>
                            </div>
                            <br />
                        </div>
                    )}
                    {error && <p className="red-text text-darken-1">{error}</p>}
                </div>

                {!success && !deleted && (
                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={DeleteYo}
                            className="delete-modal-btn waves-effect btn-flat red white-text"
                            aria-label={`Delete ${item.linkName}`}
                        >
                            Delete
                        </button>
                        <button
                            type="submit"
                            className="update-modal-btn waves-effect btn-flat teal white-text"
                            aria-label={`Update ${item.linkName}`}
                        >
                            Update
                        </button>
                    </div>
                )}
            </div>
        </form>
    )
}

export default UpdateModal
