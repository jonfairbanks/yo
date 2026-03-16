import React, { useEffect, useRef, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { getShortUrl } from '../lib/browser-short-url'

const CreateModal = () => {
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false) // Track success state
    const [newLink, setNewLink] = useState('') // Track newly created link
    const [newUrl, setNewUrl] = useState('') // Track original url for new link
    const [clickedCopy, setClickedCopy] = useState(false) // Track original url for new link
    const formRef = useRef(null)
    const modalRef = useRef(null)
    const linkNameRef = useRef(null)

    const focusLinkInputWithRetries = () => {
        const attempts = [0, 50, 120, 220, 400]
        attempts.forEach((delay) => {
            setTimeout(() => {
                if (linkNameRef.current) {
                    linkNameRef.current.focus({ preventScroll: true })
                    linkNameRef.current.select()
                } else {
                    modalRef.current?.querySelector('input')?.focus()
                }
            }, delay)
        })
    }

    const resetState = () => {
        formRef.current?.reset()
        setSuccess(false)
        setNewLink('')
        setNewUrl('')
        setError(null)
        setClickedCopy(false)
    }

    useEffect(() => {
        const M = require('@materializecss/materialize') // eslint-disable-line @typescript-eslint/no-require-imports
        const elem = document.getElementById('create')
        if (!elem) return undefined
        const modalElement = modalRef.current || elem

        const trapFocus = (event) => {
            if (event.key !== 'Tab' || !modalElement) return
            const focusable = Array.from(
                modalElement.querySelectorAll(
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

        const instance =
            M.Modal.getInstance(elem) ||
            M.Modal.init(elem, {
                onOpenStart: () => {
                    resetState()
                    focusLinkInputWithRetries()
                },
                onOpenEnd: focusLinkInputWithRetries,
                onCloseEnd: resetState,
            })

        instance.options.onOpenStart = () => {
            resetState()
            focusLinkInputWithRetries()
        }
        instance.options.onOpenEnd = focusLinkInputWithRetries
        instance.options.onCloseEnd = resetState
        modalElement?.addEventListener('keydown', trapFocus)

        const triggers = Array.from(
            document.querySelectorAll('.modal-trigger[href="#create"]')
        )
        const handleTriggerClick = () => {
            resetState()
            setTimeout(focusLinkInputWithRetries, 100)
        }
        triggers.forEach((trigger) =>
            trigger.addEventListener('click', handleTriggerClick)
        )

        return () => {
            instance.destroy()
            triggers.forEach((trigger) =>
                trigger.removeEventListener('click', handleTriggerClick)
            )
            modalElement?.removeEventListener('keydown', trapFocus)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
            setNewLink(result.linkName) // Store the new link name
            setNewUrl(result.originalUrl) // Store the original url
            setSuccess(true) // Show success message
        } catch (error) {
            setError(error.message)
        }
    }

    const handleButtonClick = () => {
        setClickedCopy(true)
        setTimeout(() => setClickedCopy(false), 2500) // Reset `clickedCopy` after N seconds
    }

    return (
        <form className="row" onSubmit={CreateNewYo} ref={formRef}>
            <div
                id="create"
                className="modal"
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-modal-title"
            >
                <div className="modal-content">
                    <a
                        href="#!"
                        className="modal-close grey-text text-darken-1"
                        aria-label="Close create modal"
                        style={{ float: 'right' }}
                    >
                        <i className="material-icons">close</i>
                    </a>
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
                                href={`/api/redirect/${newLink}`}
                                className="success-link-btn btn teal white-text icon-left"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Visit ${newLink} redirect`}
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
                </div>

                {success ? null : (
                    <div className="modal-footer">
                        <button
                            type="submit"
                            className="waves-effect btn-flat teal white-text"
                            aria-label="Create link"
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
