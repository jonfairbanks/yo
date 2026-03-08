import { auth0 } from '../../lib/auth0'
import { connectToDatabase } from '../../lib/mongoose'
import Yo from '../../models/yo'

export default async function handler(req, res) {
    const session = await auth0.getSession(req)
    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    await connectToDatabase()

    const rec = await Yo.find({}).sort({ lastAccess: -1 }).limit(10)

    return res.status(200).json(rec)
}
