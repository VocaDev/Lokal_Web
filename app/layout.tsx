import type { Metadata } from 'next'
import ProviderContext from '@/components/ProviderContext'
import '@/index.css'
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: 'LokalWeb',
  description: 'Multi-tenant SaaS LokalWeb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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