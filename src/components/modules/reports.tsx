'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch, useBusiness } from '@/lib/hooks'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/product-status'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download } from 'lucide-react'

const RANGES = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: 'custom', label: 'Personalizado' },
]

const REPORTS = [
  { value: 'sales', label: 'Ventas' },
  { value: 'profits', label: 'Ganancias / Utilidad' },
  { value: 'top_products', label: 'Productos más vendidos' },
  { value: 'inventory', label: 'Inventario valorizado' },
  { value: 'low_stock', label: 'Bajo stock' },
  { value: 'out_stock', label: 'Sin stock' },
  { value: 'near_expiry', label: 'Por vencer' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'receivables', label: 'Cuentas por cobrar' },
  { value: 'purchases', label: 'Compras' },
  { value: 'expenses', label: 'Gastos' },
]

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export default function Reports() {
  const { business } = useBusiness()
  const currency = business?.currency || 'S/'
  const [range, setRange] = useState('month')
  const [type, setType] = useState('sales')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = new URLSearchParams({ range, type })
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const { data } = useQuery({ queryKey: ['report', type, range, from, to], queryFn: () => apiFetch(`/api/reports?${params}`) })

  const exportUrl = `/api/export?resource=${type === 'top_products' || type === 'inventory' || type === 'low_stock' || type === 'out_stock' || type === 'near_expiry' || type === 'expired' ? 'products' : type === 'receivables' ? 'customers' : 'sales'}&format=xlsx`

  return (
    <div className="p-4 space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5"><Label>Reporte</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Rango</Label><Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
          {range === 'custom' && <>
            <div className="space-y-1.5"><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>}
        </div>
      </CardContent></Card>

      {/* KPIs para ventas/ganancias */}
      {type === 'sales' && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total ventas</p><p className="text-xl font-bold">{formatCurrency(data.total, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">N° ventas</p><p className="text-xl font-bold">{data.count}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Ticket promedio</p><p className="text-xl font-bold">{formatCurrency(data.count ? data.total / data.count : 0, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Métodos</p><div className="flex flex-wrap gap-1 mt-1">{Object.entries(data.byMethod || {}).map(([k, v]) => <Badge key={k} variant="secondary" className="text-[10px] capitalize">{k}: {formatCurrency(v, currency)}</Badge>)}</div></CardContent></Card>
        </div>
      )}
      {type === 'profits' && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(data.revenue, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Ganancia</p><p className="text-xl font-bold text-violet-600">{formatCurrency(data.profit, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Gastos</p><p className="text-xl font-bold text-rose-600">{formatCurrency(data.expenses, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Utilidad neta</p><p className={`text-xl font-bold ${data.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(data.net, currency)}</p></CardContent></Card>
        </div>
      )}

      {/* Gráfico por vendedor */}
      {type === 'sales' && data?.byUser?.length > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Ventas por vendedor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byUser}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => formatCurrency(v, currency)} /><Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico gastos por categoría */}
      {type === 'expenses' && data?.byCategory && (
        <Card><CardHeader><CardTitle className="text-base">Gastos por categoría</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={Object.entries(data.byCategory).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${formatCurrency(e.value, currency)}`}>{PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Tooltip formatter={(v: number) => formatCurrency(v, currency)} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabla de resultados */}
      <Card><CardContent className="p-0">
        {data?.rows && data.rows.length > 0 ? (
          <Table>
            <TableHeader><TableRow>{Object.keys(data.rows[0]).map((k) => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {data.rows.slice(0, 100).map((r: Record<string, unknown>, i: number) => (
                <TableRow key={i}>{Object.entries(r).map(([k, v]) => <TableCell key={k} className="text-xs">{formatCell(k, v)}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <div className="p-10 text-center text-muted-foreground">Sin datos para este reporte</div>}
      </CardContent></Card>

      <div className="flex justify-end">
        <a href={exportUrl}><Button variant="outline"><Download className="w-4 h-4 mr-1" />Exportar a Excel</Button></a>
      </div>
    </div>
  )
}

function formatCell(k: string, v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (k === 'total' || k === 'amount' || k === 'value' || k === 'cost' || k === 'unitCost' || k === 'profit' || k === 'balance' || k === 'paid' || k === 'subtotal') return formatCurrency(Number(v))
  if (k === 'date' || k === 'createdAt') return formatDateTime(String(v))
  if (k === 'expiry') return formatDate(String(v))
  return String(v)
}
