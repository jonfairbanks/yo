import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html>
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons&display=swap"
                    rel="stylesheet"
                />
                {/* eslint-disable-next-line @next/next/no-css-tags */}
                <link
                    rel="stylesheet"
                    href="/api/public/vendor/materialize/materialize.min.css"
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
