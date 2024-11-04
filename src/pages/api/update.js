import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import validUrl from 'valid-url'

import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'

import logger from '../../lib/logger'

export default withApiAuthRequired(async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Optional: Check user session or permissions
    // const session = await getSession(req, res)
    // const user = session?.user

    await connectToDatabase()

    const { originalUrl, linkName } = req.body

    if (validUrl.isUri(originalUrl)) {
        try {
            const item = await Yo.findOneAndUpdate(
                { linkName },
                { $set: { originalUrl, updatedAt: new Date() } },
                { new: true } // Return the updated document
            )

            if (item) {
                logger.info(`User updated alias ${linkName}: ${originalUrl}`)
                return res.status(200).json(`${linkName} updated successfully.`)
            }

            logger.warn(
                `User tried updating alias: ${linkName}, but it doesn't exist.`
            )
            return res
                .status(500)
                .json('There was an error while trying to update that Yo')
        } catch (error) {
            logger.warn(
                `There was an error while updating alias: ${linkName}: ${error}`
            )
            return res
                .status(500)
                .json('There was an error while updating that Yo')
        }
    } else {
        logger.warn(`The provided URL is improperly formatted: ${originalUrl}`)
        return res.status(400).json('The provided URL is improperly formatted.')
    }
})
