import Head from 'next/head'

import { DashboardProvider } from '../context/dashboard-context'
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
    return (
        <>
            <Head>
                <title>Yo URL Shortener</title>
                <meta
                    name="description"
                    content="Create, manage, and resolve short links with Yo URL Shortener."
                />
                <link rel="icon" type="image/png" href="/favicon.ico" />
            </Head>
            <DashboardProvider>
                <Component {...pageProps} />
            </DashboardProvider>
        </>
    )
}

export default MyApp
