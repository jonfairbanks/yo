import AllYos from './all'
import PopularYos from './popular'
import LatestYos from './latest'
import Stats from './stats'
import CreateModal from './create'
import UpdateModal from './update'
import { useDashboard } from '../context/dashboard-context'

const Tabs = () => {
    const {
        activeTab,
        closeCreateModal,
        closeUpdateModal,
        isCreateModalOpen,
        selectedItem,
        setActiveTab,
    } = useDashboard()

    return (
        <>
            <div className="row primary-body">
                <div className="col s12">
                    <ul className="tabs" role="tablist" aria-label="Yo views">
                        <li className="tab col s3" role="presentation">
                            <a
                                href="#all"
                                className={activeTab === 'all' ? 'active' : ''}
                                onClick={(event) => {
                                    event.preventDefault()
                                    setActiveTab('all')
                                }}
                                role="tab"
                                aria-controls="all"
                                aria-selected={activeTab === 'all'}
                                aria-label="All links tab"
                            >
                                All
                            </a>
                        </li>
                        <li className="tab col s3" role="presentation">
                            <a
                                href="#popular"
                                className={
                                    activeTab === 'popular' ? 'active' : ''
                                }
                                onClick={(event) => {
                                    event.preventDefault()
                                    setActiveTab('popular')
                                }}
                                role="tab"
                                aria-controls="popular"
                                aria-selected={activeTab === 'popular'}
                                aria-label="Popular links tab"
                            >
                                Popular
                            </a>
                        </li>
                        <li className="tab col s3" role="presentation">
                            <a
                                href="#latest"
                                className={
                                    activeTab === 'latest' ? 'active' : ''
                                }
                                onClick={(event) => {
                                    event.preventDefault()
                                    setActiveTab('latest')
                                }}
                                role="tab"
                                aria-controls="latest"
                                aria-selected={activeTab === 'latest'}
                                aria-label="Latest links tab"
                            >
                                Latest
                            </a>
                        </li>
                        <li className="tab col s3" role="presentation">
                            <a
                                href="#stats"
                                className={
                                    activeTab === 'stats' ? 'active' : ''
                                }
                                onClick={(event) => {
                                    event.preventDefault()
                                    setActiveTab('stats')
                                }}
                                role="tab"
                                aria-controls="stats"
                                aria-selected={activeTab === 'stats'}
                                aria-label="Stats tab"
                            >
                                Stats
                            </a>
                        </li>
                    </ul>
                </div>
                <div id="all" className="col s12" hidden={activeTab !== 'all'}>
                    <AllYos />
                </div>
                <div
                    id="popular"
                    className="col s12"
                    hidden={activeTab !== 'popular'}
                >
                    <PopularYos />
                </div>
                <div
                    id="latest"
                    className="col s12"
                    hidden={activeTab !== 'latest'}
                >
                    <LatestYos />
                </div>
                <div
                    id="stats"
                    className="col s12"
                    hidden={activeTab !== 'stats'}
                >
                    <Stats />
                </div>
            </div>
            {isCreateModalOpen ? (
                <CreateModal onClose={closeCreateModal} />
            ) : null}
            {selectedItem ? (
                <UpdateModal item={selectedItem} onClose={closeUpdateModal} />
            ) : null}
        </>
    )
}

export default Tabs
