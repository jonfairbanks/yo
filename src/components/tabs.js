import AllYos from './all'
import PopularYos from './popular'
import LatestYos from './latest'
import Stats from './stats'

const Tabs = () => {
    return (
        <div className="row primary-body">
            <div className="col s12">
                <ul className="tabs" role="tablist" aria-label="Yo views">
                    <li className="tab col s3" role="presentation">
                        <a
                            className="active"
                            href="#all"
                            role="tab"
                            aria-controls="all"
                            aria-selected="true"
                            aria-label="All links tab"
                        >
                            All
                        </a>
                    </li>
                    <li className="tab col s3" role="presentation">
                        <a
                            href="#popular"
                            role="tab"
                            aria-controls="popular"
                            aria-selected="false"
                            aria-label="Popular links tab"
                        >
                            Popular
                        </a>
                    </li>
                    <li className="tab col s3" role="presentation">
                        <a
                            href="#latest"
                            role="tab"
                            aria-controls="latest"
                            aria-selected="false"
                            aria-label="Latest links tab"
                        >
                            Latest
                        </a>
                    </li>
                    <li className="tab col s3" role="presentation">
                        <a
                            href="#stats"
                            role="tab"
                            aria-controls="stats"
                            aria-selected="false"
                            aria-label="Stats tab"
                        >
                            Stats
                        </a>
                    </li>
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
            <div id="stats" className="col s12">
                <Stats />
            </div>
        </div>
    )
}

export default Tabs
