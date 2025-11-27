import { useEffect } from 'react'
import Head from 'next/head'

import '../node_modules/@materializecss/materialize/dist/css/materialize.min.css' // Import Materialize CSS
import '../node_modules/@materializecss/materialize/dist/js/materialize.min.js' // Import Materialize JS

function MyApp({ Component, pageProps }) {
    useEffect(() => {
        // Initialize Materialize JavaScript components
        if (typeof window !== 'undefined') {
            const M = require('@materializecss/materialize') // eslint-disable-line @typescript-eslint/no-require-imports
            M.AutoInit()
        }
    }, [])

    return (
        <>
            <Head>
                <title>Yo URL Shortener</title>
                <link
                    rel="icon"
                    type="image/png"
                    href="/api/public/favicon.ico"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/icon?family=Material+Icons"
                />
            </Head>
            <Component {...pageProps} />
        </>
    )
}

export default MyApp
