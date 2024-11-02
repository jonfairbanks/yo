import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'
import { NextApiRequest, NextApiResponse } from 'next'

export default withApiAuthRequired(async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Optional: Check user session or permissions
    // const session = await getSession(req, res)
    // const user = session?.user

    await connectToDatabase()

    const yoUrls = await Yo.find().sort({ linkName: 1 })

    res.status(200).json(yoUrls)
}) 