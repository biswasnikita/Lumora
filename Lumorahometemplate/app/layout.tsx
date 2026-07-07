import React from "react"
import type { Metadata } from 'next'
import { Host_Grotesk, Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const hostGrotesk = Host_Grotesk({ subsets: ["latin"], variable: "--font-host-grotesk" });

export const metadata: Metadata = {
  title: 'Lumora | Illuminate Your Onchain Yield',
  description: 'Lumora is a transparent staking protocol on Stellar Soroban. Stake once and watch rewards accrue every second, verifiable onchain down to the last stroop.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${hostGrotesk.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
