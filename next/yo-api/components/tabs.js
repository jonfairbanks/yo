import AllYos from "./all";
import PopularYos from "./popular";
import LatestYos from "./latest";

const Tabs = () => {
	return (
		<div className="row primary-body">
			<div className="col s12">
				<ul className="tabs">
					<li className="tab col s3"><a className="active" href="#all">All</a></li>
					<li className="tab col s3"><a href="#popular">Popular</a></li>
					<li className="tab col s3"><a href="#latest">Latest</a></li>
				</ul>
			</div>
			<div id="all" className="col s12">
				<AllYos />
			</div>
			<div id="popular" className="col s12">
				<PopularYos />
			</div>
			<div id="latest" className="col s12">
				<LatestYos />
			</div>
		</div>
	);
};

export default Tabs;