import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import logger from '../../lib/logger'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res
            .status(405)
            .json({ error: 'Method not allowed. Use DELETE.' })
    }

    const session = await auth0.getSession(req)
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const { linkName } = req.body

    if (!linkName) {
        return res.status(400).json({ error: 'No link name provided.' })
    }

    try {
        const user = session.user
        const item = await Yo.findOneAndDelete({ linkName }).lean()

        if (item) {
            logger.info(
                `User ${user?.nickname || 'unknown'} deleted alias ${item.originalUrl}: ${linkName}`
            )
            return res
                .status(200)
                .json({ message: `${linkName} deleted successfully.` })
        }

        logger.warn(`Alias not found: ${linkName}`)
        return res.status(404).json({ error: `Alias ${linkName} not found.` })
    } catch (error) {
        logger.error(`Failed to delete alias: ${linkName} - ${error.message}`)
        return res.status(500).json({ error: `Failed to delete ${linkName}.` })
    }
}
