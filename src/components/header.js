import Image from 'next/image'

const Header = (user) => {
    console.log(`Logged in as ${user.user.nickname}`)
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
                <a href="#" className="brand grey-text">
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
                        className="btn modal-trigger filled icon-left teal white-text text-darken-2 darken-2"
                    >
                        <i className="material-icons">add</i>Create
                    </a>
                </div>
            </div>
        </nav>
    )
}

export default Header
