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
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch, useBusiness } from '@/lib/hooks'
import { formatCurrency, formatDateTime } from '@/lib/product-status'
import { Plus, Trash2, ClipboardList, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface Prod { id: string; name: string; internalCode: string; stock: number; purchasePrice: number; unit: string }
interface Sup { id: string; name: string }

export default function Purchases() {
  const qc = useQueryClient()
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data } = useQuery<{ purchases: Array<{ id: string; documentNo: string | null; createdAt: string; total: number; supplier?: { name: string } | null; user?: { name: string } | null; items?: Array<{ name: string; quantity: number; unitCost: number }> }> }>({
    queryKey: ['purchases', from, to], queryFn: () => {
      const p = new URLSearchParams()
      if (from) p.set('from', from); if (to) p.set('to', to)
      return apiFetch(`/api/purchases?${p}`)
    },
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Nueva compra</Button>
      </div>

      <Card><CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead>Registrado por</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.purchases || []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.documentNo || '—'}</TableCell>
                  <TableCell>{p.supplier?.name || '—'}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell className="text-xs">{p.user?.name || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(p.total, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(data?.purchases || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin compras registradas</div>}
        </ScrollArea>
      </CardContent></Card>

      <PurchaseDialog open={open} onClose={() => setOpen(false)} onSaved={() => qc.invalidateQueries({ queryKey: ['purchases'] })} />
    </div>
  )
}

function PurchaseDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const [supplierId, setSupplierId] = useState('')
  const [documentNo, setDocumentNo] = useState('')
  const [notes, setNotes] = useState('')
  const [attachment, setAttachment] = useState('')
  const [items, setItems] = useState<Array<{ productId: string; name: string; quantity: number; unitCost: number }>>([])
  const [saving, setSaving] = useState(false)
  const [prodSearch, setProdSearch] = useState('')

  const { data: sup } = useQuery<{ suppliers: Sup[] }>({ queryKey: ['suppliers'], queryFn: () => apiFetch('/api/suppliers') })
  const { data: prodData } = useQuery<{ products: Prod[] }>({ queryKey: ['products', prodSearch], queryFn: () => apiFetch(`/api/products?q=${encodeURIComponent(prodSearch)}`) })

  const addProduct = (p: Prod) => {
    if (items.find((i) => i.productId === p.id)) return
    setItems([...items, { productId: p.id, name: p.name, quantity: 1, unitCost: p.purchasePrice }])
    setProdSearch('')
  }
  const updateItem = (i: number, patch: Partial<{ quantity: number; unitCost: number }>) => setItems(items.map((x, j) => j === i ? { ...x, ...patch } : x))
  const removeItem = (i: number) => setItems(items.filter((_, j) => j !== i))
  const total = items.reduce((s, x) => s + x.quantity * x.unitCost, 0)

  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await res.json()
    if (d.url) setAttachment(d.url)
  }

  const save = async () => {
    if (!items.length) { toast.error('Agrega productos'); return }
    setSaving(true)
    try {
      await apiFetch('/api/purchases', { method: 'POST', body: JSON.stringify({ supplierId: supplierId || null, documentNo, notes, attachment, items }) })
      toast.success('Compra registrada')
      onSaved(); onClose()
      setItems([]); setSupplierId(''); setDocumentNo(''); setNotes(''); setAttachment('')
    } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Registrar compra</DialogTitle></DialogHeader>
        <ScrollArea className="flex-1 pr-2 scroll-thin">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Proveedor</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{(sup?.suppliers || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>N° documento</Label><Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} placeholder="Factura / boleta" /></div>
            </div>

            <div className="space-y-1.5">
              <Label>Buscar producto</Label>
              <Input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="Nombre o código..." />
              {prodSearch && (
                <div className="border rounded max-h-40 overflow-auto scroll-thin">
                  {(prodData?.products || []).slice(0, 8).map((p) => (
                    <button key={p.id} className="w-full text-left px-2 py-1.5 hover:bg-accent text-sm border-b" onClick={() => addProduct(p)}>
                      <span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">· {p.internalCode} · stock {p.stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Table>
              <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-24">Cantidad</TableHead><TableHead className="w-28">Costo unit.</TableHead><TableHead className="text-right w-24">Total</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{it.name}</TableCell>
                    <TableCell><Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: +e.target.value })} className="h-8" /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={it.unitCost} onChange={(e) => updateItem(i, { unitCost: +e.target.value })} className="h-8" /></TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(it.quantity * it.unitCost, currency)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="text-destructive h-7" onClick={() => removeItem(i)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end"><div className="text-right"><p className="text-xs text-muted-foreground">Total compra</p><p className="text-xl font-bold">{formatCurrency(total, currency)}</p></div></div>

            <div className="space-y-1.5">
              <Label>Comprobante (opcional)</Label>
              {attachment ? <img src={attachment} alt="" className="h-24 rounded" /> : <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-accent"><Upload className="w-4 h-4" />Subir<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>}
            </div>
            <div className="space-y-1.5"><Label>Observaciones</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        </ScrollArea>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving || !items.length}>{saving ? 'Guardando...' : 'Guardar compra'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
