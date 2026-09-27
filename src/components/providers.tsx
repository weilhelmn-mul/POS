'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useUI } from '@/store/ui'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
})

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const theme = useUI((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'theme-blue', 'theme-green', 'theme-pro')
    if (theme === 'dark') root.classList.add('dark')
    else if (theme !== 'light') root.classList.add(`theme-${theme}`)
  }, [theme])
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier>{children}</ThemeApplier>
    </QueryClientProvider>
  )
}
