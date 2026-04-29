'use client'

import '@/index.css'
import { ThemeProvider } from 'next-themes'
import ProviderContext from './ProviderContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ProviderContext>
        {children}
      </ProviderContext>
    </ThemeProvider>
  )
}
