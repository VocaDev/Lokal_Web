import type { Metadata } from 'next'
import ProviderContext from '@/components/ProviderContext'
import '@/index.css'
import { ThemeProvider } from 'next-themes';
import { headers } from 'next/headers'
import { isMainDomain } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'LokalWeb — Websites for Kosovo Businesses',
  description: 'Get a professional website and booking system for your Kosovo business in minutes.',
  themeColor: '#4f8ef7',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LokalWeb',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const heads = await headers()
  const host = heads.get('host') || ''

  // Tenant subdomain pages render their own <html> via app/[subdomain]; this
  // root layout only wraps chrome routes. Detection mirrors middleware.ts via
  // the shared helper so the two never drift.
  if (!isMainDomain(host) && host.includes('.')) {
    return <>{children}</>
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#4f8ef7" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Chrome fonts (Geist + Geist Mono) and tenant-side font choices for templates */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ProviderContext>
            {children}
          </ProviderContext>
        </ThemeProvider>
      </body>
    </html>
  )
}