import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0'

import Tabs from '../components/tabs'
import Header from '../components/header'
import Footer from '../components/footer'
import CreateModal from '../components/create'

import '../app/globals.css'

// Fetch user data with getServerSideProps
export const getServerSideProps = withPageAuthRequired({
    async getServerSideProps(context) {
        const session = await getSession(context.req, context.res)
        const user = session?.user || null

        return {
            props: { user },
        }
    },
})

function HomePage({ user }) {
    return (
        <div className="page-container">
            <div className="page-content">
                <Header user={user} />
                <Tabs />
                <CreateModal />
            </div>
            <Footer />
        </div>
    )
}

export default HomePage
