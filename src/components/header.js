import Image from 'next/image'
import { useDashboard } from '../context/dashboard-context'

const Header = (user) => {
    const { openCreateModal } = useDashboard()

    return (
        <nav>
            <div className="nav-wrapper">
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
                <div>
                    <span
                        className="grey-text text-darken-2"
                        style={{ marginRight: '10px', fontStyle: 'italic' }}
                    >
                        {user.user.nickname}
                    </span>
                    <a
                        href="#create"
                        className="btn filled icon-left teal white-text text-darken-2 darken-2"
                        aria-label="Open create modal"
                        onClick={(event) => {
                            event.preventDefault()
                            openCreateModal()
                        }}
                    >
                        <i className="material-icons">add</i>Create
                    </a>
                </div>
            </div>
        </nav>
    )
}

export default Header
