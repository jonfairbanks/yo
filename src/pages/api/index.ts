import { withApiAuthRequired } from '@auth0/nextjs-auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { NextApiRequest, NextApiResponse } from 'next'

export default withApiAuthRequired(async function handler(req: NextApiRequest, res: NextApiResponse) {
    await connectToDatabase()

    const yoUrls = await Yo.find().sort({ linkName: 1 })

    res.status(200).json(yoUrls)
}) 