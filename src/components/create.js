import React, { useRef, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'
import { useDashboard } from '../context/dashboard-context'
import ModalShell from './modal-shell'

const CreateModal = ({ onClose }) => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [newLink, setNewLink] = useState('')
    const [newUrl, setNewUrl] = useState('')
    const [clickedCopy, setClickedCopy] = useState(false)
    const formRef = useRef(null)
    const linkNameRef = useRef(null)
    const { refreshDashboard, scheduleRefresh } = useDashboard()

    const resetState = () => {
        formRef.current?.reset()
        setSuccess(false)
        setNewLink('')
        setNewUrl('')
        setError(null)
        setClickedCopy(false)
    }

    const CreateNewYo = async (event) => {
        event.preventDefault() // Prevent page reload

        const form = event.target
        const linkName = form.linkName.value
        const originalUrl = form.originalUrl.value

        const data = {
            linkName: linkName,
            originalUrl: originalUrl,
        }

        // Reset states before the new request
        setSuccess(false)
        setClickedCopy(false)
        setError(null)

        try {
            const response = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Unknown error occurred')
            }

            const result = await response.json()

            // Reset form after successful submission
            form.reset()
            setNewLink(result.linkName)
            setNewUrl(result.originalUrl)
            setSuccess(true)
            refreshDashboard()
        } catch (error) {
            setError(error.message)
        }
    }

    const handleButtonClick = () => {
        setClickedCopy(true)
        setTimeout(() => setClickedCopy(false), 2500)
    }

    return (
        <form className="row" onSubmit={CreateNewYo} ref={formRef}>
            <ModalShell
                ariaLabelledBy="create-modal-title"
                initialFocusRef={linkNameRef}
                onClose={() => {
                    resetState()
                    onClose()
                }}
                footer={
                    success ? null : (
                        <button
                            type="submit"
                            className="waves-effect btn-flat teal white-text"
                            aria-label="Create link"
                        >
                            Create
                        </button>
                    )
                }
            >
                    {success ? (
                        <div>
                            <h1
                                id="create-modal-title"
                                className="success-text teal-text"
                            >
                                Success!
                            </h1>
                            <p className="success-subtext grey-text">
                                New Yo link has been created
                            </p>
                            <pre style={{ float: 'left' }}>
                                {getShortUrl(newLink)}
                            </pre>
                            <i
                                style={{ float: 'left' }}
                                className="material-icons grey-text"
                            >
                                arrow_right_alt
                            </i>
                            <pre>{newUrl}</pre>
                            <br />
                            <a
                                href={getShortUrl(newLink)}
                                className="success-link-btn btn teal white-text icon-left"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Visit ${newLink} redirect`}
                                onClick={() => scheduleRefresh()}
                            >
                                <i className="material-icons">redo</i> Go to
                                Link
                            </a>
                            {clickedCopy ? (
                                <a
                                    href="#"
                                    className="btn grey grey-text text-darken-3 icon-left"
                                    aria-label="Link copied"
                                >
                                    <i className="material-icons teal-text text-darken-1">
                                        done
                                    </i>{' '}
                                    Copied
                                </a>
                            ) : (
                                <CopyToClipboard
                                    text={getShortUrl(newLink)}
                                >
                                    <a
                                        href="#"
                                        onClick={handleButtonClick}
                                        className="btn grey grey-text text-darken-3 icon-left"
                                        aria-label={`Copy ${newLink} link`}
                                    >
                                        <i className="material-icons">
                                            content_copy
                                        </i>{' '}
                                        Copy Link
                                    </a>
                                </CopyToClipboard>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h4>Create a New Link</h4>
                            <div className="s12 m6 input-field">
                                <input
                                    id="linkName"
                                    type="text"
                                    placeholder="rick"
                                    maxLength="120"
                                    required
                                    aria-label="Link name"
                                    ref={linkNameRef}
                                    autoFocus
                                />
                                <label htmlFor="linkName">Link Name</label>
                                <span className="supporting-text">
                                    What should the new link be named?
                                </span>
                            </div>
                            <br />
                            <br />
                            <div className="s12 m6 input-field">
                                <input
                                    id="originalUrl"
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                    required
                                    aria-label="Website URL"
                                />
                                <label htmlFor="originalUrl">Website URL</label>
                                <span className="supporting-text">
                                    What is the original URL you want to
                                    redirect users to?
                                </span>
                            </div>
                            <br />
                        </div>
                    )}

                    {/* Show error message if there is an error */}
                    {error && <p className="red-text text-darken-1">{error}</p>}
            </ModalShell>
        </form>
    )
}

export default CreateModal
