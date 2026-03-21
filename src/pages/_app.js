import Head from 'next/head'
import Script from 'next/script'

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
                <link
                    rel="icon"
                    type="image/png"
                    href="/favicon.ico"
                />
            </Head>
            <Script
                src="/vendor/materialize/materialize.min.js"
                strategy="afterInteractive"
                onLoad={() => {
                    if (typeof window !== 'undefined' && window.M) {
                        window.M.AutoInit()
                    }
                }}
            />
            <Component {...pageProps} />
        </>
    )
}

export default MyApp
