import Tabs from "../components/tabs";
import Header from "../components/header";
import Footer from "../components/footer";
import CreateModal from "../components/create";
import UpdateModal from "../components/update";

import '../app/globals.css';

const HomePage = () => {
	return (
		<div>
			<Header />
			<Tabs />
			<CreateModal />
			<UpdateModal />
			<Footer />
		</div>
	);
};

export default HomePage;