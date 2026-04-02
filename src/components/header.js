import Image from 'next/image'

import { useDashboard } from '../context/dashboard-context'

const Header = ({ user }) => {
    const { openCreateModal } = useDashboard()

    return (
        <nav>
            <div className="nav-wrapper">
                <div className="header-brand-group">
                    <Image
                        src="/images/apple-touch-icon.png"
                        alt="Yo URL"
                        className="header-logo"
                        width={45}
                        height={45}
                        priority
                    />
                    <a
                        href="#"
                        className="brand grey-text"
                        aria-label="Go to the Yo dashboard"
                    >
                        Yo
                    </a>
                </div>
                <div className="header-user-actions">
                    <span className="header-user-nickname grey-text text-darken-2">
                        {user.nickname}
                    </span>
                    <button
                        type="button"
                        className="btn modal-trigger filled teal white-text text-darken-2 darken-2 header-create-button"
                        aria-label="Open create modal"
                        onClick={openCreateModal}
                    >
                        Create
                    </button>
                </div>
            </div>
        </nav>
    )
}

export default Header
