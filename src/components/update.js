import React, { useEffect, useRef, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'
import { useDashboard } from '../context/dashboard-context'
import ModalShell from './modal-shell'

const UpdateModal = ({ item, onClose }) => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const [originalUrl, setOriginalUrl] = useState('')
    const [clickedCopy, setClickedCopy] = useState(null)
    const originalUrlRef = useRef(null)
    const { refreshDashboard, scheduleRefresh } = useDashboard()

    useEffect(() => {
        if (item) {
            setOriginalUrl(item.originalUrl || '')
            setError(null)
            setSuccess(false)
            setDeleted(false)
            setClickedCopy(false)
        }
    }, [item])

    const UpdateYo = async (event) => {
        event.preventDefault() // Prevent page reload

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
            refreshDashboard()
        } catch (error) {
            setError(error.message)
        }
    }

    const DeleteYo = async () => {
        const data = { linkName: item.linkName }

        try {
            const response = await fetch(`/api/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error('Failed to delete item')
            setDeleted(true)
            refreshDashboard()
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
            <ModalShell
                ariaLabelledBy="update-modal-title"
                initialFocusRef={originalUrlRef}
                onClose={onClose}
                footer={
                    !success && !deleted ? (
                        <>
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
                        </>
                    ) : null
                }
            >
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
                                onClick={() => scheduleRefresh()}
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
                                    ref={originalUrlRef}
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
            </ModalShell>
        </form>
    )
}

export default UpdateModal
