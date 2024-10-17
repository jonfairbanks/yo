import Image from "next/image";

const Header = () => {
	return (
		<nav>
			<div className="nav-wrapper">
				<Image src="/images/apple-touch-icon.png" alt="Yo URL" className="header-logo" width={50} height={50} />
				<a href="#" className="brand grey-text">Yo</a>
				<a href="#create" className="btn modal-trigger filled icon-left teal white-text text-darken-2">
					<i className="material-icons">add</i>Create
				</a>
			</div>
		</nav>
	);
};

export default Header;