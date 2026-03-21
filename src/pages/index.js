import { auth0 } from '../lib/auth0'

import Tabs from '../components/tabs'
import Header from '../components/header'
import Footer from '../components/footer'
import CreateModal from '../components/create'
import UpdateModal from '../components/update'

export async function getServerSideProps(context) {
    const session = await auth0.getSession(context.req)

    if (!session) {
        return {
            redirect: {
                destination: '/auth/login',
                permanent: false,
            },
        }
    }

    return {
        props: { user: session.user || null },
    }
}

function HomePage({ user }) {
    return (
        <div className="page-container">
            <div className="page-content">
                <Header user={user} />
                <Tabs />
                <CreateModal />
                <UpdateModal />
            </div>
            <Footer />
        </div>
    )
}

export default HomePage
