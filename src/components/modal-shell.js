import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'

const ModalShell = ({
    ariaLabelledBy,
    children,
    footer = null,
    onClose,
    initialFocusRef = null,
}) => {
    const dialogRef = useRef(null)

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return undefined

        const focusInitialElement = () => {
            const focusTarget =
                initialFocusRef?.current ||
                dialog.querySelector('input:not([disabled]), button, a[href]')

            focusTarget?.focus({ preventScroll: true })
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
                return
            }

            if (event.key !== 'Tab') return

            const focusable = Array.from(
                dialog.querySelectorAll(FOCUSABLE_SELECTOR)
            ).filter(
                (element) =>
                    !element.hasAttribute('disabled') &&
                    element.getAttribute('tabindex') !== '-1' &&
                    element.offsetParent !== null
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

        focusInitialElement()
        dialog.addEventListener('keydown', handleKeyDown)
        document.body.classList.add('modal-open')

        return () => {
            dialog.removeEventListener('keydown', handleKeyDown)
            document.body.classList.remove('modal-open')
        }
    }, [initialFocusRef, onClose])

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                ref={dialogRef}
                className="modal modal-react-open"
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-content">
                    <button
                        type="button"
                        className="modal-close grey-text text-darken-1 modal-close-button"
                        aria-label="Close modal"
                        onClick={onClose}
                    >
                        <i className="material-icons">close</i>
                    </button>
                    {children}
                </div>
                {footer ? <div className="modal-footer">{footer}</div> : null}
            </div>
        </div>
    )
}

export default ModalShell
