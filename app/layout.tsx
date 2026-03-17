import type { Metadata } from 'next'
import ProviderContext from '@/components/ProviderContext'
import '@/index.css'

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
    <html lang="en">
      <body>
        <ProviderContext>
          {children}
        </ProviderContext>
      </body>
    </html>
  )
}
