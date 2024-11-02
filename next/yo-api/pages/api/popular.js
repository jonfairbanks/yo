import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'

export default withApiAuthRequired(async function handler(req, res) {
    // Optional: Check user session or permissions
    // const session = await getSession(req, res)
    // const user = session?.user

    await connectToDatabase()

    const pop = await Yo.find({}).sort({ urlHits: -1 }).limit(10)

    res.status(200).json(pop)
})
