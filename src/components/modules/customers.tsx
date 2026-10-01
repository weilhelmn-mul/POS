'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/store/auth'
import { apiFetch } from '@/lib/hooks'
import { formatCurrency, formatDate } from '@/lib/product-status'
import { Plus, Search, Pencil, Trash2, Users, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { triggerGlobalSync } from '@/hooks/use-global-sync'

export default function Customers() {
  const has = useAuth((s) => s.has)
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [withDebt, setWithDebt] = useState(false)
  const { data } = useQuery<{ customers: Array<{ id: string; name: string; document: string | null; phone: string | null; email: string | null; address: string | null; creditLimit: number; creditBalance: number; createdAt: string }> }>({
    queryKey: ['customers', q, withDebt],
    queryFn: () => apiFetch(`/api/customers?q=${encodeURIComponent(q)}${withDebt ? '&withDebt=1' : ''}`),
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Button variant={withDebt ? 'secondary' : 'outline'} onClick={() => setWithDebt((v) => !v)}>Solo con deuda</Button>
        {has('customers.create') && <CustomerDialog trigger={<Button><Plus className="w-4 h-4 mr-1" />Nuevo</Button>} onSaved={() => qc.invalidateQueries({ queryKey: ['customers'] })} />}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contacto</TableHead><TableHead>Límite crédito</TableHead><TableHead>Saldo</TableHead>{has('customers.edit') && <TableHead className="text-right">Acciones</TableHead>}</TableRow></TableHeader>
          <TableBody>
            {(data?.customers || []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.document || 'Sin documento'}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</div>}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(c.creditLimit)}</TableCell>
                <TableCell>{c.creditBalance > 0 ? <Badge variant="destructive">{formatCurrency(c.creditBalance)}</Badge> : <Badge variant="secondary">Al día</Badge>}</TableCell>
                {has('customers.edit') && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <CustomerDialog customer={c} trigger={<Button size="icon" variant="ghost"><Pencil className="w-4 h-4" /></Button>} onSaved={() => qc.invalidateQueries({ queryKey: ['customers'] })} />
                      {has('customers.delete') && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => { if (!confirm(`¿Eliminar a "${c.name}"?`)) return; try { await apiFetch(`/api/customers/${c.id}`, { method: 'DELETE' }); toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['customers'] }) } catch (e) { toast.error((e as Error).message) } }}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(data?.customers || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin clientes</div>}
      </CardContent></Card>
    </div>
  )
}

function CustomerDialog({ customer, trigger, onSaved }: { customer?: { id: string; name: string; document: string | null; phone: string | null; email: string | null; address: string | null; creditLimit: number; notes?: string | null }; trigger: React.ReactNode; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', address: '', creditLimit: 0, notes: '' })
  const [saving, setSaving] = useState(false)

  const onOpen = (o: boolean) => {
    if (o) {
      setForm(customer ? { name: customer.name, document: customer.document || '', phone: customer.phone || '', email: customer.email || '', address: customer.address || '', creditLimit: customer.creditLimit, notes: '' } : { name: '', document: '', phone: '', email: '', address: '', creditLimit: 0, notes: '' })
    }
    setOpen(o)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      if (customer) await apiFetch(`/api/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(form) })
      else await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(form) })
      toast.success(customer ? 'Cliente actualizado' : 'Cliente creado')
      onSaved(); setOpen(false)
      // 🔥 Sincronizar inmediatamente a Firebase
      triggerGlobalSync()
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{customer ? 'Editar' : 'Nuevo'} cliente</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
          <div className="space-y-1.5"><Label>DNI / RUC</Label><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Límite de crédito</Label><Input type="number" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: +e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

