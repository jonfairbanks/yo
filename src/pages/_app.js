import Head from 'next/head'
import Script from 'next/script'

import '../public/vendor/materialize/materialize.min.css'

function MyApp({ Component, pageProps }) {
    return (
        <>
            <Head>
                <title>Yo URL Shortener</title>
                <link
                    rel="icon"
                    type="image/png"
                    href="/api/public/favicon.ico"
                />
            </Head>
            <Script
                src="/api/public/vendor/materialize/materialize.min.js"
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
