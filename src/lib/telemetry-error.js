const categories = new Set(['db_timeout', 'db_auth', 'dns', 'tls', 'unknown'])

// Classify driver errors without exporting exception text or causes.
export const classifyTelemetryError = (error) => {
    const pending = [{ error, depth: 0 }]
    const visited = new Set()
    for (let index = 0; index < pending.length && index < 32; index += 1) {
        const { error: current, depth } = pending[index]
        if (!current || typeof current !== 'object' || visited.has(current))
            continue
        visited.add(current)
        if (categories.has(current.telemetryCategory)) {
            return current.telemetryCategory
        }
        const { code, name } = current
        if (code === 18 || name === 'MongoAuthenticationError') return 'db_auth'
        if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns'
        if (
            typeof code === 'string' &&
            (code.startsWith('ERR_TLS_') ||
                code.startsWith('CERT_') ||
                [
                    'DEPTH_ZERO_SELF_SIGNED_CERT',
                    'SELF_SIGNED_CERT_IN_CHAIN',
                    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
                    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
                ].includes(code))
        )
            return 'tls'
        if (
            ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 50, 262].includes(code) ||
            [
                'MongoNetworkTimeoutError',
                'MongoOperationTimeoutError',
                'MongoExecutionTimeoutError',
            ].includes(name)
        )
            return 'db_timeout'
        if (depth >= 4) continue
        const enqueue = (nested) => {
            if (nested && pending.length < 32)
                pending.push({ error: nested, depth: depth + 1 })
        }
        enqueue(current.cause)
        enqueue(current.reason)
        enqueue(current.error)
        if (current.servers instanceof Map) {
            for (const server of current.servers.values()) {
                enqueue(server)
                if (pending.length >= 32) break
            }
        }
    }
    return 'unknown'
}
