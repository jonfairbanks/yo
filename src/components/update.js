import React, { useEffect, useRef, useState } from 'react'

import { useDashboard } from '../context/dashboard-context'
import LinkActions from './link-actions'
import ModalShell from './modal-shell'

const UpdateModal = () => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const [originalUrl, setOriginalUrl] = useState('')
    const originalUrlRef = useRef(null)
    const {
        closeUpdateModal,
        refreshDashboard,
        scheduleRefresh,
        selectedItem,
    } = useDashboard()

    useEffect(() => {
        if (selectedItem) {
            setOriginalUrl(selectedItem.originalUrl || '')
            setError(null)
            setSuccess(false)
            setDeleted(false)
        }
    }, [selectedItem])

    if (!selectedItem) {
        return null
    }

    const UpdateYo = async (event) => {
        event.preventDefault() // Prevent page reload

        const data = {
            linkName: selectedItem.linkName,
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
        const data = { linkName: selectedItem.linkName }

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

    return (
        <form className="row" onSubmit={UpdateYo}>
            <ModalShell
                ariaLabelledBy="update-modal-title"
                initialFocusRef={originalUrlRef}
                onClose={closeUpdateModal}
                footer={
                    !success && !deleted ? (
                        <>
                            <button
                                type="button"
                                onClick={DeleteYo}
                                className="delete-modal-btn waves-effect btn-flat red white-text"
                                aria-label={`Delete ${selectedItem.linkName}`}
                            >
                                Delete
                            </button>
                            <button
                                type="submit"
                                className="update-modal-btn waves-effect btn-flat teal white-text"
                                aria-label={`Update ${selectedItem.linkName}`}
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
                                    {selectedItem.linkName}
                                </pre>
                                <span>Yo link has been updated</span>
                            </p>
                            <pre>{originalUrl}</pre>
                            <br />
                            <LinkActions
                                linkName={selectedItem.linkName}
                                originalUrl={originalUrl}
                                onVisit={() => scheduleRefresh()}
                            />
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
                                    {selectedItem.linkName}
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
                                    value={selectedItem.linkName}
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
