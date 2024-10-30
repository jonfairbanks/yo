import React, { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

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
        const M = require('@materializecss/materialize')
        const elem = document.getElementById('update')
        const instance = M.Modal.init(elem, {
            dismissible: true,
            onCloseEnd: () => {
                if (onClose) onClose()
                setSuccess(false) // Reset the state when the Modal closes
                setDeleted(false) // Reset the state when the Modal closes
            },
        })

        instance.open()

        return () => instance.destroy()
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

            const result = await response.json()
            setSuccess(true)
        } catch (error) {
            setError(error.message)
            console.error('Error submitting form:', error)
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
        } catch (error) {
            setError('Error deleting item')
            console.error('Error deleting item:', error)
        }
    }

    const handleButtonClick = () => {
        setClickedCopy(true)
        setTimeout(() => setClickedCopy(false), 2500) // Reset `clickedCopy` after N seconds
    }

    return (
        <form className="row" onSubmit={UpdateYo}>
            <div id="update" className="modal">
                <div className="modal-content">
                    {success ? (
                        <div>
                            <h1 className="success-text teal-text">Updated!</h1>
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
                                {window.location.host + '/' + item.linkName}
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
                                href={`/api/redirect/${item.linkName}`}
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
                                <CopyToClipboard
                                    text={
                                        window.location.host +
                                        '/' +
                                        item.linkName
                                    }
                                >
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
                        >
                            Delete
                        </button>
                        <button
                            type="submit"
                            className="update-modal-btn waves-effect btn-flat teal white-text"
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
