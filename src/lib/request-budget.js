// A process-wide backstop. The ingress must enforce limits across replicas.
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

export const createRedirectBudget = () => {
    const take = createTokenBucket({ rate: 10, capacity: 20 })
    let active = 0
    return {
        acquire() {
            if (active >= 10 || !take()) return null
            active += 1
            let released = false
            return () => {
                if (!released) active -= 1
                released = true
            }
        },
    }
}

export const acquireRedirectBudget = () => {
    globalThis.__yoRedirectBudget ||= createRedirectBudget()
    return globalThis.__yoRedirectBudget.acquire()
}
