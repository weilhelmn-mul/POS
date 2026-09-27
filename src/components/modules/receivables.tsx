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
import { apiFetch } from '@/lib/hooks'
import { formatCurrency, formatDateTime } from '@/lib/product-status'
import { FileWarning, HandCoins } from 'lucide-react'
import { toast } from 'sonner'

export default function Receivables() {
  const qc = useQueryClient()
  const { data } = useQuery<{ customers: Array<{ id: string; name: string; document: string | null; phone: string | null; balance: number; limit: number; sales: Array<{ id: string; invoice: string; date: string; total: number; balance: number }> }>; total: number }>({
    queryKey: ['receivables'], queryFn: () => apiFetch('/api/receivables'),
  })
  const [pay, setPay] = useState<{ saleId: string; invoice: string; balance: number } | null>(null)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('cash')

  const submit = async () => {
    if (!pay) return
    try {
      await apiFetch(`/api/sales/${pay.saleId}/payments`, { method: 'POST', body: JSON.stringify({ amount, method }) })
      toast.success('Abono registrado')
      setPay(null); setAmount(0)
      qc.invalidateQueries({ queryKey: ['receivables'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total por cobrar</p>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(data?.total || 0)}</p>
          </div>
          <FileWarning className="w-10 h-10 text-blue-400" />
        </CardContent>
      </Card>

      {(data?.customers || []).map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.document || '—'} {c.phone && `· ${c.phone}`}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-600">{formatCurrency(c.balance)}</p>
                <p className="text-xs text-muted-foreground">de {formatCurrency(c.limit)} límite</p>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Factura</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="text-right">Abonar</TableHead></TableRow></TableHeader>
              <TableBody>
                {c.sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(s.date)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.total)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatCurrency(s.balance)}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setPay({ saleId: s.id, invoice: s.invoice, balance: s.balance }); setAmount(s.balance) }}><HandCoins className="w-3.5 h-3.5 mr-1" />Abonar</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {(data?.customers || []).length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground"><FileWarning className="w-10 h-10 mx-auto mb-2 opacity-30" />No hay cuentas pendientes</CardContent></Card>}

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar abono</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-center p-2 bg-muted rounded"><p className="text-xs text-muted-foreground">Factura {pay?.invoice}</p><p className="text-lg font-bold">Saldo: {formatCurrency(pay?.balance || 0)}</p></div>
            <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Método</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="card">Tarjeta</SelectItem><SelectItem value="yape">Yape</SelectItem><SelectItem value="plin">Plin</SelectItem><SelectItem value="transfer">Transferencia</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPay(null)}>Cancelar</Button><Button onClick={submit} disabled={amount <= 0 || amount > (pay?.balance || 0)}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
