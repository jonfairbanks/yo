import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { NextApiRequest, NextApiResponse } from 'next'
import { auth0 } from '../../lib/auth0'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await auth0.getSession(req)
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const yoUrls = await Yo.find().sort({ linkName: 1 })

    res.status(200).json(yoUrls)
}
