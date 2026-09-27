'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, CreditCard } from 'lucide-react'
import type { PaymentSplit } from '@/types'
import { formatCurrency } from '@/lib/product-status'

const METHODS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'transfer', label: 'Transferencia' },
]

export function PaymentDialog({ open, total, onClose, onConfirm, canCredit }: {
  open: boolean; total: number; onClose: () => void
  onConfirm: (splits: PaymentSplit[], method: string) => Promise<void>
  canCredit: boolean
}) {
  const [splits, setSplits] = useState<PaymentSplit[]>([{ method: 'cash', amount: total }])
  const [credit, setCredit] = useState(false)
  const [saving, setSaving] = useState(false)

  const paid = splits.reduce((s, p) => s + p.amount, 0)
  const remaining = +(total - paid).toFixed(2)
  const change = paid > total ? +(paid - total).toFixed(2) : 0
  const effectiveMethod = credit ? 'credit' : splits.length > 1 ? 'mixed' : splits[0]?.method || 'cash'

  const setSplit = (i: number, patch: Partial<PaymentSplit>) => setSplits((s) => s.map((x, j) => j === i ? { ...x, ...patch } : x))
  const addSplit = () => setSplits((s) => [...s, { method: 'cash', amount: Math.max(0, remaining) }])
  const removeSplit = (i: number) => setSplits((s) => s.filter((_, j) => j !== i))

  const submit = async () => {
    if (credit) {
      setSaving(true)
      await onConfirm([], 'credit')
      setSaving(false)
      return
    }
    if (Math.abs(remaining) > 0.01 && !credit) {
      // permitir si hay vuelto (overpay) o exigir exacto
      if (paid < total) return
    }
    setSaving(true)
    await onConfirm(splits.filter((s) => s.amount > 0), effectiveMethod)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Cobrar venta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center py-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground">TOTAL A COBRAR</p>
            <p className="text-3xl font-bold">{formatCurrency(total)}</p>
          </div>

          {canCredit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Venta a crédito (cliente con deuda pendiente)</span>
            </label>
          )}

          {!credit && (
            <div className="space-y-2">
              <Label>Métodos de pago</Label>
              {splits.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={s.method} onValueChange={(v) => setSplit(i, { method: v as PaymentSplit['method'] })}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" step="0.01" value={s.amount} onChange={(e) => setSplit(i, { amount: +e.target.value })} />
                  {splits.length > 1 && <Button variant="outline" size="icon" onClick={() => removeSplit(i)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSplit}><Plus className="w-4 h-4 mr-1" />Agregar método (pago mixto)</Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-muted"><span>Pagado:</span><span className="font-semibold">{formatCurrency(paid)}</span></div>
            <div className="flex justify-between p-2 rounded bg-muted"><span>Restante:</span><span className={`font-semibold ${remaining > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatCurrency(Math.abs(remaining))}</span></div>
          </div>
          {change > 0 && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-center">
              <span className="text-sm">Vuelto:</span> <span className="text-xl font-bold">{formatCurrency(change)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || (!credit && paid < total)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {credit ? 'Registrar venta a crédito' : 'Confirmar venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
