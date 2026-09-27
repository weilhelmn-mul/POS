'use client'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useUI } from '@/store/ui'
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } } })
function ThemeSync({ children }: { children: React.ReactNode }) {
  const theme = useUI((s) => s.theme)
  const { setTheme } = useTheme()
  useEffect(() => { setTheme(theme) }, [theme, setTheme])
  return <>{children}</>
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <ThemeSync>{children}</ThemeSync>
      </NextThemesProvider>
    </QueryClientProvider>
  )
}
