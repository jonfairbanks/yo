import logger from './logger'
import { normalizeLinkName } from './link-name'

export const recordRedirectCompletion = (span, alias, status) => {
    span.setAttribute('yo.result', 'redirect')
    span.setAttribute('http.response.status_code', status)
    try {
        logger.info({
            event: 'redirect_success',
            alias: normalizeLinkName(alias),
            status,
        })
    } catch {
        // A telemetry write must not change a completed redirect response.
    }
}
