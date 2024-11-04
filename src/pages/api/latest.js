import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'

export default withApiAuthRequired(async function handler(req, res) {
    // Optional: Check user session or permissions
    // const session = await getSession(req, res)
    // const user = session?.user

    await connectToDatabase()

    const rec = await Yo.find({}).sort({ lastAccess: -1 }).limit(10)

    return res.status(200).json(rec)
})
