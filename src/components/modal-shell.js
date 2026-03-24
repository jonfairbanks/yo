import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const ModalShell = ({
    ariaLabelledBy,
    children,
    footer = null,
    initialFocusRef,
    onClose,
}) => {
    const dialogRef = useRef(null)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const focusTarget =
                initialFocusRef?.current ||
                dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)

            focusTarget?.focus?.()
        }, 0)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [initialFocusRef])

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onCloseRef.current?.()
                return
            }

            if (event.key !== 'Tab') return

            const dialog = dialogRef.current
            if (!dialog) return

            const focusable = Array.from(
                dialog.querySelectorAll(FOCUSABLE_SELECTOR)
            ).filter(
                (element) =>
                    element.getAttribute('tabindex') !== '-1' &&
                    element.getAttribute('aria-hidden') !== 'true'
            )

            if (!focusable.length) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            const activeElement = document.activeElement

            if (!dialog.contains(activeElement)) {
                event.preventDefault()
                ;(event.shiftKey ? last : first).focus()
                return
            }

            if (event.shiftKey && activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.body.classList.add('modal-open')

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.classList.remove('modal-open')
        }
    }, [])

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose?.()
                }
            }}
        >
            <div
                ref={dialogRef}
                className="modal modal-react-open open"
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
            >
                <div className="modal-content">
                    <button
                        type="button"
                        className="modal-close-button grey-text text-darken-1"
                        aria-label="Close modal"
                        onClick={() => onClose?.()}
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
