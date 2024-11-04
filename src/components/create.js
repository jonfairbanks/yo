import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

const CreateModal = () => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false) // Track success state
    const [newLink, setNewLink] = useState('') // Track newly created link
    const [newUrl, setNewUrl] = useState('') // Track original url for new link
    const [clickedCopy, setClickedCopy] = useState('') // Track original url for new link

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
            console.log('Created Successfully:', result)

            // Reset form after successful submission
            form.reset()
            setNewLink(result.linkName) // Store the new link name
            setNewUrl(result.originalUrl) // Store the original url
            setSuccess(true) // Show success message
        } catch (error) {
            setError(error.message)
            console.error('Error submitting form:', error)
        }
    }

    const handleButtonClick = () => {
        setClickedCopy(true)
        setTimeout(() => setClickedCopy(false), 2500) // Reset `clickedCopy` after N seconds
    }

    return (
        <form className="row" onSubmit={CreateNewYo}>
            <div id="create" className="modal">
                <div className="modal-content">
                    {success ? (
                        <div>
                            <h1 className="success-text teal-text">Success!</h1>
                            <p className="success-subtext grey-text">
                                New Yo link has been created
                            </p>
                            <pre style={{ float: 'left' }}>
                                {window.location.host + '/' + newLink}
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
                                href={`/api/redirect/${newLink}`}
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
                                    text={window.location.host + '/' + newLink}
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
                </div>

                {success ? null : (
                    <div className="modal-footer">
                        <button
                            type="submit"
                            className="waves-effect btn-flat teal white-text"
                        >
                            Create
                        </button>
                    </div>
                )}
            </div>
        </form>
    )
}

export default CreateModal
