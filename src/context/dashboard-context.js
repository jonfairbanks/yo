import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react'

const DashboardContext = createContext(null)
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

    const applyTableFilter = useCallback((filter) => {
        setTableFilter(filter || DEFAULT_TABLE_FILTER)

        if (typeof window !== 'undefined') {
            const tabsElement = document.querySelector('.tabs')
            const tabsInstance = window.M?.Tabs?.getInstance?.(tabsElement)

            window.location.hash = 'all'

            if (tabsInstance?.select) {
                tabsInstance.select('all')
            } else {
                document.querySelector('.tabs a[href="#all"]')?.dispatchEvent(
                    new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                    })
                )
            }

            document.getElementById('all')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }
    }, [])

    const clearTableFilter = useCallback(() => {
        setTableFilter(DEFAULT_TABLE_FILTER)
    }, [])

    const value = useMemo(
        () => ({
            applyTableFilter,
            clearTableFilter,
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
            selectedItem,
            tableFilter,
        }),
        [
            applyTableFilter,
            clearTableFilter,
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
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
