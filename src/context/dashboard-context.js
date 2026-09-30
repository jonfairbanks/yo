import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

const DashboardContext = createContext(null)
const TAB_IDS = ['all', 'popular', 'latest', 'stats']
const DEFAULT_TABLE_FILTER = {
    id: 'all',
    label: 'All links',
    params: {},
}

export const DashboardProvider = ({ children }) => {
    const [refreshVersion, setRefreshVersion] = useState(0)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [tableFilter, setTableFilter] = useState(DEFAULT_TABLE_FILTER)
    const [activeTab, setActiveTabState] = useState('all')

    useEffect(() => {
        const syncTab = () => {
            const tab = window.location.hash.slice(1)
            setActiveTabState(TAB_IDS.includes(tab) ? tab : 'all')
        }

        syncTab()
        window.addEventListener('popstate', syncTab)
        window.addEventListener('hashchange', syncTab)
        return () => {
            window.removeEventListener('popstate', syncTab)
            window.removeEventListener('hashchange', syncTab)
        }
    }, [])

    const setActiveTab = useCallback((tab) => {
        if (!TAB_IDS.includes(tab)) return
        setActiveTabState(tab)
        if (window.location.hash !== `#${tab}`) {
            window.history.pushState(window.history.state, '', `#${tab}`)
        }
    }, [])

    const refreshDashboard = useCallback(() => {
        setRefreshVersion((value) => value + 1)
    }, [])

    const scheduleRefresh = useCallback((delay = 500) => {
        window.setTimeout(() => {
            setRefreshVersion((value) => value + 1)
        }, delay)
    }, [])

    const openCreateModal = useCallback(() => {
        setIsCreateModalOpen(true)
    }, [])

    const closeCreateModal = useCallback(() => {
        setIsCreateModalOpen(false)
    }, [])

    const openUpdateModal = useCallback((item) => {
        setSelectedItem(item)
    }, [])

    const closeUpdateModal = useCallback(() => {
        setSelectedItem(null)
    }, [])

    const applyTableFilter = useCallback(
        (filter) => {
            setTableFilter(filter || DEFAULT_TABLE_FILTER)
            setActiveTab('all')
        },
        [setActiveTab]
    )

    const clearTableFilter = useCallback(() => {
        setTableFilter(DEFAULT_TABLE_FILTER)
    }, [])

    const value = useMemo(
        () => ({
            applyTableFilter,
            activeTab,
            clearTableFilter,
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
            setActiveTab,
            selectedItem,
            tableFilter,
        }),
        [
            applyTableFilter,
            activeTab,
            clearTableFilter,
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
            setActiveTab,
            selectedItem,
            tableFilter,
        ]
    )

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    )
}

export const useDashboard = () => {
    const value = useContext(DashboardContext)

    if (!value) {
        throw new Error('useDashboard must be used within DashboardProvider.')
    }

    return value
}
