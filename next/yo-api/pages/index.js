import Tabs from "../components/tabs";
import Header from "../components/header";
import Footer from "../components/footer";
import CreateModal from "../components/create";

import '../app/globals.css';

const HomePage = () => {
	return (
		<div>
			<Header />
			<Tabs />
			<CreateModal />
			<Footer />
		</div>
	);
};

export default HomePage;