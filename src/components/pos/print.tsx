'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Barcode } from '@/components/barcode'
import { Printer } from 'lucide-react'
import type { BusinessSettings } from '@/lib/settings'
import { formatCurrency, formatDateTime } from '@/lib/product-status'

export interface PrintSale {
  invoiceNumber: string
  createdAt: string
  customer?: { name: string; document?: string | null; address?: string | null } | null
  user?: { name: string } | null
  items: Array<{ name: string; quantity: number; unitPrice: number; discount: number; total: number }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  creditBalance: number
  paymentMethod: string
  notes?: string | null
  observations?: string | null
}

function Ticket80({ sale, business }: { sale: PrintSale; business: BusinessSettings }) {
  return (
    <div className="ticket-80mm bg-white text-black mx-auto" id="ticket-80">
      <div className="text-center">
        {business.logo && <img src={business.logo} alt="logo" className="h-12 mx-auto mb-1" />}
        <h1 className="font-bold text-base">{business.name}</h1>
        <div className="text-[10px]">{business.address}</div>
        <div className="text-[10px]">Tel: {business.phone} {business.ruc ? `· RUC: ${business.ruc}` : ''}</div>
      </div>
      <hr />
      <div className="text-[10px]">
        <div className="flex justify-between"><span>Fecha:</span><span>{formatDateTime(sale.createdAt)}</span></div>
        <div className="flex justify-between"><span>Comprob.:</span><span>{sale.invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Vendedor:</span><span>{sale.user?.name || '—'}</span></div>
        <div className="flex justify-between"><span>Cliente:</span><span>{sale.customer?.name || 'Consumidor'}</span></div>
      </div>
      <hr />
      <table>
        <thead>
          <tr className="text-[10px] border-b border-dashed border-black">
            <th className="text-left">Cant.</th><th className="text-left">Producto</th><th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={i} className="align-top">
              <td className="pr-1">{it.quantity}</td>
              <td className="pr-1">{it.name}{it.discount ? ` (desc -${formatCurrency(it.discount, business.currency)})` : ''}</td>
              <td className="text-right whitespace-nowrap">{formatCurrency(it.total, business.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <div className="text-[11px]">
        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(sale.subtotal, business.currency)}</span></div>
        {sale.discount > 0 && <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(sale.discount, business.currency)}</span></div>}
        {sale.tax > 0 && <div className="flex justify-between"><span>IGV ({business.taxRate}%):</span><span>{formatCurrency(sale.tax, business.currency)}</span></div>}
        <div className="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>{formatCurrency(sale.total, business.currency)}</span></div>
        <hr />
        <div className="flex justify-between"><span>Pagado:</span><span>{formatCurrency(sale.paidAmount, business.currency)}</span></div>
        {sale.creditBalance > 0 && <div className="flex justify-between font-bold"><span>Saldo:</span><span>{formatCurrency(sale.creditBalance, business.currency)}</span></div>}
        <div className="flex justify-between"><span>Método:</span><span className="uppercase">{sale.paymentMethod}</span></div>
      </div>
      <hr />
      <div className="text-center">
        <Barcode value={sale.invoiceNumber} height={40} width={1.5} displayValue className="mx-auto" />
      </div>
      <div className="text-center text-[10px] mt-1">{business.ticketFooter}</div>
    </div>
  )
}

function InvoiceA4({ sale, business }: { sale: PrintSale; business: BusinessSettings }) {
  return (
    <div className="invoice-a4 bg-white text-black" id="invoice-a4">
      <div className="flex justify-between items-start mb-6 border-b pb-4">
        <div>
          {business.logo && <img src={business.logo} alt="logo" className="h-16 mb-2" />}
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <div className="text-sm">{business.address}</div>
          <div className="text-sm">Tel: {business.phone} · {business.email}</div>
          {business.ruc && <div className="text-sm">RUC: {business.ruc}</div>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase">{sale.creditBalance > 0 ? 'Nota de Crédito' : 'Factura'}</h2>
          <div className="text-sm">N° {sale.invoiceNumber}</div>
          <div className="text-sm">Fecha: {formatDateTime(sale.createdAt)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="border rounded p-3">
          <div className="font-semibold mb-1">Cliente</div>
          <div>{sale.customer?.name || 'Consumidor Final'}</div>
          {sale.customer?.document && <div>Doc: {sale.customer.document}</div>}
          {sale.customer?.address && <div>{sale.customer.address}</div>}
        </div>
        <div className="border rounded p-3">
          <div className="font-semibold mb-1">Vendedor</div>
          <div>{sale.user?.name || '—'}</div>
          <div className="mt-1">Método de pago: <span className="uppercase font-medium">{sale.paymentMethod}</span></div>
        </div>
      </div>
      <table className="mb-4">
        <thead>
          <tr>
            <th style={{ width: '8%' }}>Cant.</th>
            <th>Descripción</th>
            <th style={{ width: '12%' }}>P. Unit</th>
            <th style={{ width: '10%' }}>Desc.</th>
            <th style={{ width: '14%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={i}>
              <td>{it.quantity}</td>
              <td>{it.name}</td>
              <td>{formatCurrency(it.unitPrice, business.currency)}</td>
              <td>{it.discount ? formatCurrency(it.discount, business.currency) : '—'}</td>
              <td>{formatCurrency(it.total, business.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(sale.subtotal, business.currency)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(sale.discount, business.currency)}</span></div>}
          {sale.tax > 0 && <div className="flex justify-between"><span>IGV ({business.taxRate}%):</span><span>{formatCurrency(sale.tax, business.currency)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>TOTAL:</span><span>{formatCurrency(sale.total, business.currency)}</span></div>
          <div className="flex justify-between"><span>Pagado:</span><span>{formatCurrency(sale.paidAmount, business.currency)}</span></div>
          {sale.creditBalance > 0 && <div className="flex justify-between font-bold text-red-600"><span>Saldo pendiente:</span><span>{formatCurrency(sale.creditBalance, business.currency)}</span></div>}
        </div>
      </div>
      {sale.observations && (
        <div className="mt-6 text-sm border-t pt-3">
          <span className="font-semibold">Observaciones: </span>{sale.observations}
        </div>
      )}
      <div className="mt-8 text-center text-xs text-gray-500">{business.ticketFooter}</div>
    </div>
  )
}

export function PrintPreview({ sale, business, open, onClose }: { sale: PrintSale; business: BusinessSettings; open: boolean; onClose: () => void }) {
  const print = () => { window.print() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista previa de impresión · {sale.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4 scroll-thin">
          <Tabs defaultValue="80mm">
            <TabsList className="mb-3">
              <TabsTrigger value="80mm">Ticket 80mm</TabsTrigger>
              <TabsTrigger value="a4">Factura A4</TabsTrigger>
            </TabsList>
            <TabsContent value="80mm"><div className="printable"><Ticket80 sale={sale} business={business} /></div></TabsContent>
            <TabsContent value="a4"><div className="printable"><InvoiceA4 sale={sale} business={business} /></div></TabsContent>
          </Tabs>
        </div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={print}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
