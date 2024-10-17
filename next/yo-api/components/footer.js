const Footer = () => {
	return (
		<footer className="page-footer">
			<div className="footer-copyright">
				<div className="container">
					© {new Date().getFullYear()} - Fairbanks.io
					<a className="right text-grey" href="https://github.com/jonfairbanks/yo">GitHub</a>
				</div>
			</div>
		</footer>
	);
};

export default Footer;