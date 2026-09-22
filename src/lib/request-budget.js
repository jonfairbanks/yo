// Budgets are per IP within this process. Replicas do not share state.
export const createTokenBucket = ({
    rate,
    capacity,
    now = () => performance.now(),
}) => {
    let tokens = capacity
    let updatedAt = now()

    return () => {
        const current = now()
        tokens = Math.min(
            capacity,
            tokens + (Math.max(0, current - updatedAt) * rate) / 1000
        )
        updatedAt = current
        if (tokens < 1) return false
        tokens -= 1
        return true
    }
}

export const createRedirectBudget = ({
    now = () => performance.now(),
    maxIdleClients = 10000,
    idleTtlMs = 60000,
} = {}) => {
    const activeClients = new Map()
    const idleClients = new Map()

    const rememberIdle = (ip, entry) => {
        entry.lastUsed = now()
        idleClients.delete(ip)
        idleClients.set(ip, entry)
        while (idleClients.size > maxIdleClients) {
            idleClients.delete(idleClients.keys().next().value)
        }
    }

    return {
        acquire(ip) {
            const time = now()
            for (const [key, entry] of idleClients) {
                if (time - entry.lastUsed < idleTtlMs) break
                idleClients.delete(key)
            }
            const entry = activeClients.get(ip) ||
                idleClients.get(ip) || {
                    take: createTokenBucket({ rate: 10, capacity: 20, now }),
                    active: 0,
                }
            if (entry.active >= 10 || !entry.take()) {
                if (entry.active === 0) rememberIdle(ip, entry)
                return null
            }
            idleClients.delete(ip)
            activeClients.set(ip, entry)
            entry.active += 1
            let released = false
            return () => {
                if (released) return
                released = true
                entry.active -= 1
                if (entry.active === 0) {
                    activeClients.delete(ip)
                    rememberIdle(ip, entry)
                }
            }
        },
    }
}

export const acquireRedirectBudget = (ip) => {
    globalThis.__yoIpRedirectBudget ||= createRedirectBudget()
    return globalThis.__yoIpRedirectBudget.acquire(ip)
}
