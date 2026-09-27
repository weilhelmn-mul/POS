'use client'
import { useUI } from '@/store/ui'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useUI()
  const { theme: resolved } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? (resolved === 'dark') : true
  const cycle = () => { const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'; setTheme(next) }
  const icon = !mounted ? 'dark_mode' : theme === 'system' ? 'contrast' : isDark ? 'dark_mode' : 'light_mode'
  const label = !mounted ? 'Tema' : theme === 'system' ? 'Auto' : isDark ? 'Oscuro' : 'Claro'
  if (compact) return (<Button variant="ghost" size="icon" onClick={cycle} title={`Tema: ${label}`} className="rounded-full h-8 w-8"><span className="material-symbols-outlined text-[18px]">{icon}</span></Button>)
  return (<Button variant="ghost" onClick={cycle} className="rounded-full h-9 px-3 gap-1.5 text-sm" title="Cambiar tema"><span className="material-symbols-outlined text-[20px]">{icon}</span><span className="hidden sm:inline">{label}</span></Button>)
}
