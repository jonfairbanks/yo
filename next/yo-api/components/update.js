import React, { useState, useEffect } from 'react'

const UpdateModal = ({ item }) => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [newLink, setNewLink] = useState('')
    const [originalUrl, setOriginalUrl] = useState('')

    // Sync state with `item` whenever `item` changes
    useEffect(() => {
        if (item) {
            setNewLink(item.linkName || '')
            setOriginalUrl(item.originalUrl || '')
        }
    }, [item])

    const UpdateYo = async (event) => {
        event.preventDefault() // Prevent page reload

        const data = {
            linkName: newLink,
            originalUrl,
        }

        setSuccess(false)
        setError(null)

        try {
            const response = await fetch('/api/update', {
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
            console.log('Success:', result)

            setSuccess(true) // Show success message
        } catch (error) {
            setError(error.message)
            console.error('Error submitting form:', error)
        }
    }

    return (
        <form className="row" onSubmit={UpdateYo}>
            <div id="update" className="modal">
                <div className="modal-content">
                    {success ? (
                        <div>
                            <p>Success! Your link has been updated.</p>
                            <a
                                href={`/api/redirect/${newLink}`}
                                className="btn grey"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="material-icons">redo</i> Go to
                                Link
                            </a>
                            <a
                                href="#"
                                className="btn teal white-text text-darken-4"
                            >
                                <i className="material-icons">content_copy</i>{' '}
                                Copy Link
                            </a>
                        </div>
                    ) : (
                        <div>
                            <h4>Update Link</h4>
                            <div className="s12 m6 input-field">
                                <input
                                    id="linkName"
                                    type="text"
                                    value={newLink}
                                    onChange={(e) => setNewLink(e.target.value)}
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

                <div className="modal-footer">
                    {!success && (
                        <div>
                            <button
                                type="button"
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
            </div>
        </form>
    )
}

export default UpdateModal
