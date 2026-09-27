'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/hooks'
import { formatDateTime } from '@/lib/product-status'
import { Search, ScrollText } from 'lucide-react'

const ENTITIES = ['auth', 'product', 'sale', 'customer', 'purchase', 'expense', 'user', 'backup', 'setting', 'payment']

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  void: 'bg-amber-100 text-amber-700',
  login: 'bg-violet-100 text-violet-700',
  restore: 'bg-cyan-100 text-cyan-700',
  payment: 'bg-teal-100 text-teal-700',
}

export default function Audit() {
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data } = useQuery<{ logs: Array<{ id: string; action: string; entity: string; entityId: string | null; oldValue: string | null; newValue: string | null; createdAt: string; user?: { name: string } | null; authorizedBy?: { name: string } | null; ip?: string | null }> }>({
    queryKey: ['audit', q, entity, from, to], queryFn: () => {
      const p = new URLSearchParams()
      if (q) p.set('q', q)
      if (entity !== 'all') p.set('entity', entity)
      if (from) p.set('from', from); if (to) p.set('to', to)
      return apiFetch(`/api/audit?${p}`)
    },
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar acción..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={entity} onValueChange={setEntity}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las entidades</SelectItem>{ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
      </div>

      <Card><CardContent className="p-0">
        <ScrollArea className="max-h-[72vh]">
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Usuario</TableHead><TableHead>Acción</TableHead><TableHead>Entidad</TableHead><TableHead>Detalle</TableHead><TableHead>Autorizado por</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.logs || []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell className="text-xs">{l.user?.name || '—'}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${ACTION_COLORS[l.action] || 'bg-gray-100'}`}>{l.action}</Badge></TableCell>
                  <TableCell className="text-xs">{l.entity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{l.newValue ? l.newValue.slice(0, 120) : l.entityId || '—'}</TableCell>
                  <TableCell className="text-xs">{l.authorizedBy?.name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(data?.logs || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><ScrollText className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin registros de auditoría</div>}
        </ScrollArea>
      </CardContent></Card>
    </div>
  )
}
