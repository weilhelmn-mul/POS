'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/store/auth'
import { useBusiness, apiFetch } from '@/lib/hooks'
import { formatCurrency, formatDateTime } from '@/lib/product-status'
import { PrintPreview, type PrintSale } from '@/components/pos/print'
import { Confirm } from '@/components/pos/confirm'
import { Search, Eye, Printer, Ban, Copy, Receipt } from 'lucide-react'
import { toast } from 'sonner'

interface SaleRow {
  id: string; invoiceNumber: string; createdAt: string; total: number; paidAmount: number; creditBalance: number
  paymentMethod: string; status: string; customer?: { name: string } | null; user?: { name: string } | null
  items?: Array<{ name: string; quantity: number; unitPrice: number; discount: number; total: number }>
  customer?: { name: string; document?: string | null; address?: string | null } | null
  user?: { name: string } | null
  subtotal: number; discount: number; tax: number; notes?: string | null; observations?: string | null
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  credit: 'bg-amber-100 text-amber-700',
  voided: 'bg-red-100 text-red-700 line-through',
  suspended: 'bg-blue-100 text-blue-700',
}

export default function Sales() {
  const has = useAuth((s) => s.has)
  const qc = useQueryClient()
  const { business } = useBusiness()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [view, setView] = useState<SaleRow | null>(null)
  const [print, setPrint] = useState<PrintSale | null>(null)
  const [voidTarget, setVoidTarget] = useState<SaleRow | null>(null)

  const { data } = useQuery<{ sales: SaleRow[] }>({
    queryKey: ['sales', q, status, method, from, to],
    queryFn: () => {
      const p = new URLSearchParams()
      if (q) p.set('q', q)
      if (status !== 'all') p.set('status', status)
      if (method !== 'all') p.set('method', method)
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      return apiFetch(`/api/sales?${p}`)
    },
  })

  const openView = async (s: SaleRow) => {
    const full = await apiFetch<{ sale: SaleRow }>(`/api/sales/${s.id}`)
    setView(full.sale)
  }

  const replicate = async (s: SaleRow) => {
    const data = await apiFetch<{ items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; discount: number; image: string | null; stock: number; isBundle: boolean }>; customerId: string | null; customerName: string }>(`/api/sales/${s.id}/replicate`, { method: 'POST' })
    // cargar en una nueva venta del POS
    const { useCart } = await import('@/store/cart')
    const cart = useCart.getState()
    const id = cart.newSale()
    if (data.customerId) cart.setCustomer(data.customerId, data.customerName)
    cart.replaceItems(data.items.map((it) => ({ ...it, total: +(it.quantity * it.unitPrice - it.discount).toFixed(2) })))
    toast.success('Venta replicada al POS')
    const { useUI } = await import('@/store/ui')
    useUI.getState().setModule('pos')
  }

  const doVoid = async () => {
    if (!voidTarget) return
    try {
      await apiFetch(`/api/sales/${voidTarget.id}`, { method: 'DELETE', body: JSON.stringify({ reason: 'Anulación manual' }) })
      toast.success('Venta anulada')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setVoidTarget(null)
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Factura o cliente..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="completed">Completadas</SelectItem><SelectItem value="credit">A crédito</SelectItem><SelectItem value="voided">Anuladas</SelectItem></SelectContent></Select>
        <Select value={method} onValueChange={setMethod}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Método" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="card">Tarjeta</SelectItem><SelectItem value="yape">Yape</SelectItem><SelectItem value="plin">Plin</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="credit">Crédito</SelectItem></SelectContent></Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
      </div>

      <Card><CardContent className="p-0">
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader><TableRow><TableHead>Factura</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Vendedor</TableHead><TableHead>Método</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.sales || []).map((s) => (
                <TableRow key={s.id} className={s.status === 'voided' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(s.createdAt)}</TableCell>
                  <TableCell>{s.customer?.name || 'Consumidor'}</TableCell>
                  <TableCell className="text-xs">{s.user?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{s.paymentMethod}</Badge> {s.status === 'credit' && s.creditBalance > 0 && <Badge variant="destructive" className="text-[10px] ml-1">Debe</Badge>}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(s.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openView(s)} title="Ver"><Eye className="w-4 h-4" /></Button>
                      {has('sales.reprint') && <Button size="icon" variant="ghost" onClick={() => setPrint(s as PrintSale)} title="Reimprimir"><Printer className="w-4 h-4" /></Button>}
                      <Button size="icon" variant="ghost" onClick={() => replicate(s)} title="Replicar"><Copy className="w-4 h-4" /></Button>
                      {has('sales.void') && s.status !== 'voided' && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setVoidTarget(s)} title="Anular"><Ban className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(data?.sales || []).length === 0 && <div className="p-10 text-center text-muted-foreground"><Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />Sin ventas</div>}
        </ScrollArea>
      </CardContent></Card>

      {/* Ver detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle · {view?.invoiceNumber}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Cliente:</span> {view?.customer?.name || 'Consumidor'}</div>
                <div><span className="text-muted-foreground">Vendedor:</span> {view?.user?.name || '—'}</div>
                <div><span className="text-muted-foreground">Fecha:</span> {view && formatDateTime(view.createdAt)}</div>
                <div><span className="text-muted-foreground">Método:</span> <span className="uppercase">{view?.paymentMethod}</span></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Precio</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {view?.items?.map((it, i) => (
                    <TableRow key={i}><TableCell className="text-xs">{it.name}</TableCell><TableCell className="text-right text-xs">{it.quantity}</TableCell><TableCell className="text-right text-xs">{formatCurrency(it.unitPrice)}</TableCell><TableCell className="text-right text-xs font-medium">{formatCurrency(it.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-1 ml-auto w-48 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{view && formatCurrency(view.subtotal)}</span></div>
                {view && view.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>-{formatCurrency(view.discount)}</span></div>}
                {view && view.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGV</span><span>{formatCurrency(view.tax)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{view && formatCurrency(view.total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span>{view && formatCurrency(view.paidAmount)}</span></div>
                {view && view.creditBalance > 0 && <div className="flex justify-between text-red-500 font-medium"><span>Saldo</span><span>{formatCurrency(view.creditBalance)}</span></div>}
              </div>
              {view?.observations && <div className="text-xs"><span className="text-muted-foreground">Observaciones: </span>{view.observations}</div>}
            </div>
          </ScrollArea>
          <DialogFooter>
            {view && <Button variant="outline" onClick={() => setPrint(view as PrintSale)}><Printer className="w-4 h-4 mr-1" />Imprimir</Button>}
            <Button variant="outline" onClick={() => setView(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Confirm open={!!voidTarget} title="Anular venta" description={`¿Anular la venta ${voidTarget?.invoiceNumber}? El stock será restaurado.`} confirmText="Anular" destructive onCancel={() => setVoidTarget(null)} onConfirm={doVoid} />

      {print && business && <PrintPreview sale={print} business={business} open={!!print} onClose={() => setPrint(null)} />}
    </div>
  )
}
