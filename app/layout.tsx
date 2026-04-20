import type { Metadata } from 'next'
import ProviderContext from '@/components/ProviderContext'
import '@/index.css'
import { ThemeProvider } from 'next-themes';
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'LokalWeb — Websites for Kosovo Businesses',
  description: 'Get a professional website and booking system for your Kosovo business in minutes.',
  manifest: '/manifest.json',
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
  
  // Detekto nëse jemi në një subdomain (p.sh. emri.lokalweb.com ose emri.localhost:3000)
  const isSubdomain = host.split('.').length > (host.includes('localhost') ? 1 : 2) || 
                     (host.includes('.lokalweb.com') && !host.startsWith('www.'))

  if (isSubdomain) {
    return <>{children}</>
  }

  return (
    <html lang="en" suppressHydrationWarning>
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