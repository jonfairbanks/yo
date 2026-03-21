import React, { useRef, useState } from 'react'

import { getShortUrl } from '../lib/browser-short-url'
import { useDashboard } from '../context/dashboard-context'
import { useSlugValidation } from '../hooks/use-slug-validation'
import LinkActions from './link-actions'
import ModalShell from './modal-shell'

const CreateModal = () => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [newLink, setNewLink] = useState('')
    const [newUrl, setNewUrl] = useState('')
    const formRef = useRef(null)
    const linkNameRef = useRef(null)
    const {
        closeCreateModal,
        isCreateModalOpen,
        refreshDashboard,
        scheduleRefresh,
    } = useDashboard()
    const {
        isCheckingDuplicate,
        isValid: isLinkNameValid,
        normalizedLinkName,
        validationMessage,
    } = useSlugValidation(newLink)

    const resetState = () => {
        formRef.current?.reset()
        setSuccess(false)
        setNewLink('')
        setNewUrl('')
        setError(null)
    }

    const CreateNewYo = async (event) => {
        event.preventDefault() // Prevent page reload

        const linkName = newLink
        const originalUrl = newUrl

        if (validationMessage) {
            setError(validationMessage)
            return
        }

        const data = {
            linkName: linkName,
            originalUrl: originalUrl,
        }

        // Reset states before the new request
        setSuccess(false)
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
            formRef.current?.reset()
            setNewLink(result.linkName)
            setNewUrl(result.originalUrl)
            setSuccess(true)
            refreshDashboard()
        } catch (error) {
            setError(error.message)
        }
    }

    if (!isCreateModalOpen) {
        return null
    }

    return (
        <form className="row" onSubmit={CreateNewYo} ref={formRef}>
            <ModalShell
                ariaLabelledBy="create-modal-title"
                initialFocusRef={linkNameRef}
                onClose={() => {
                    resetState()
                    closeCreateModal()
                }}
                footer={
                    success ? null : (
                        <button
                            type="submit"
                            className="waves-effect btn-flat teal white-text"
                            aria-label="Create link"
                            disabled={
                                !newLink.trim() ||
                                !newUrl.trim() ||
                                isCheckingDuplicate ||
                                !isLinkNameValid
                            }
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
                            <LinkActions
                                linkName={newLink}
                                originalUrl={newUrl}
                                onVisit={() => scheduleRefresh()}
                            />
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
                                    value={newLink}
                                    onChange={(event) =>
                                        setNewLink(event.target.value)
                                    }
                                />
                                <label htmlFor="linkName">Link Name</label>
                                <span className="supporting-text">
                                    What should the new link be named?
                                </span>
                                {newLink.trim() ? (
                                    <p className="grey-text text-lighten-1">
                                        Short URL preview:{' '}
                                        <strong>
                                            {getShortUrl(
                                                normalizedLinkName || newLink
                                            )}
                                        </strong>
                                    </p>
                                ) : null}
                                {isCheckingDuplicate ? (
                                    <p className="grey-text text-lighten-1">
                                        Checking availability...
                                    </p>
                                ) : validationMessage ? (
                                    <p className="red-text text-darken-1">
                                        {validationMessage}
                                    </p>
                                ) : normalizedLinkName ? (
                                    <p className="green-text text-accent-3">
                                        Link name is available.
                                    </p>
                                ) : null}
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
                                    value={newUrl}
                                    onChange={(event) =>
                                        setNewUrl(event.target.value)
                                    }
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
