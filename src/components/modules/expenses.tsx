'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch, useBusiness } from '@/lib/hooks'
import { formatCurrency, formatDateTime } from '@/lib/product-status'
import { Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

const CATS = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'otros', label: 'Otros' },
]

export default function Expenses() {
  const qc = useQueryClient()
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [form, setForm] = useState({ category: 'otros', description: '', amount: 0 })
  const [saving, setSaving] = useState(false)

  const { data } = useQuery<{ expenses: Array<{ id: string; category: string; description: string; amount: number; createdAt: string; user?: { name: string } | null }> }>({
    queryKey: ['expenses', from, to], queryFn: () => {
      const p = new URLSearchParams()
      if (from) p.set('from', from); if (to) p.set('to', to)
      return apiFetch(`/api/expenses?${p}`)
    },
  })

  const total = (data?.expenses || []).reduce((s, e) => s + e.amount, 0)

  const save = async () => {
    if (!form.description || form.amount <= 0) { toast.error('Completa los datos'); return }
    setSaving(true)
    try {
      await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Gasto registrado')
      setOpen(false); setForm({ category: 'otros', description: '', amount: 0 })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Nuevo gasto</Button>
      </div>

      <Card className="bg-rose-50/40 border-rose-200">
        <CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Total gastos (rango)</p><p className="text-3xl font-bold text-rose-600">{formatCurrency(total, currency)}</p></div>
          <Wallet className="w-10 h-10 text-rose-400" />
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Descripción</TableHead><TableHead>Registrado por</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
          <TableBody>
            {(data?.expenses || []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{formatDateTime(e.createdAt)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{e.category}</Badge></TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="text-xs">{e.user?.name || '—'}</TableCell>
                <TableCell className="text-right font-semibold text-rose-600">{formatCurrency(e.amount, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(data?.expenses || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin gastos</div>}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Categoría</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
