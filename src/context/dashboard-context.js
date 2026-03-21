import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const DashboardContext = createContext(null)

export const DashboardProvider = ({ children }) => {
    const [refreshVersion, setRefreshVersion] = useState(0)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)

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

    const value = useMemo(
        () => ({
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
            selectedItem,
        }),
        [
            closeCreateModal,
            closeUpdateModal,
            isCreateModalOpen,
            openCreateModal,
            openUpdateModal,
            refreshDashboard,
            refreshVersion,
            scheduleRefresh,
            selectedItem,
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
