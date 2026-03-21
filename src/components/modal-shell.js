import { useEffect } from 'react'

const ModalShell = ({
    ariaLabelledBy,
    children,
    footer = null,
    initialFocusRef,
    onClose,
}) => {
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            initialFocusRef?.current?.focus?.()
        }, 0)

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose?.()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            window.clearTimeout(timeoutId)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [initialFocusRef, onClose])

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
