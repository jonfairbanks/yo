import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { UserProvider } from '@auth0/nextjs-auth0/client';

import './globals.css'

const geistSans = localFont({
    src: './fonts/GeistVF.woff',
    variable: '--font-geist-sans',
    weight: '100 900',
})
const geistMono = localFont({
    src: './fonts/GeistMonoVF.woff',
    variable: '--font-geist-mono',
    weight: '100 900',
})

export const metadata: Metadata = {
    title: 'Yo URL',
    description: "Yo dawg, heard you're tired of remembering links.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <UserProvider>
                <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                >
                    {children}
                </body>
            </UserProvider>
        </html>
    )
}
