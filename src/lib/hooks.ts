'use client'
import { useQuery } from '@tanstack/react-query'
import type { BusinessSettings } from '@/lib/settings'

export function useBusiness() {
  const { data } = useQuery<BusinessSettings>({
    queryKey: ['business'],
    queryFn: async () => (await fetch('/api/settings')).json().then((d) => d.business),
    staleTime: 60_000,
  })
  return { business: data }
}

export async function apiFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Error ${res.status}`)
  return data as T
}
