'use client'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, DollarSign, ShoppingCart, AlertTriangle, PackageX, CalendarClock, Users, Wallet, Package } from 'lucide-react'
import { useBusiness } from '@/lib/hooks'
import { useUI } from '@/store/ui'
import { formatCurrency } from '@/lib/product-status'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'

interface Dash {
  todayTotal: number; monthTotal: number; todayProfit: number; monthProfit: number
  todayCount: number; monthCount: number; expensesToday: number; expensesMonth: number
  totalProducts: number; totalCustomers: number
  lowStock: number; outStock: number; nearExpiry: number; expired: number
  totalReceivables: number; customersWithDebt: number
  salesByHour: Array<{ hour: number; total: number; count: number }>
  salesByDay: Array<{ label: string; total: number; count: number }>
}

export default function Dashboard() {
  const { business } = useBusiness()
  const { setModule } = useUI()
  const currency = business?.currency || 'S/'
  const { data, isLoading } = useQuery<Dash>({ queryKey: ['dashboard'], queryFn: async () => (await fetch('/api/dashboard')).json(), refetchInterval: 60_000 })

  if (isLoading || !data) {
    return <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
  }

  const cards = [
    { label: 'Ventas Hoy', value: formatCurrency(data.todayTotal, currency), sub: `${data.todayCount} ventas`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', mod: 'sales' as const },
    { label: 'Ventas del Mes', value: formatCurrency(data.monthTotal, currency), sub: `${data.monthCount} ventas`, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50', mod: 'sales' as const },
    { label: 'Ganancia Hoy', value: formatCurrency(data.todayProfit, currency), sub: 'utilidad estimada', icon: TrendingUp, color: 'text-violet-600 bg-violet-50', mod: 'reports' as const },
    { label: 'Ganancia Mes', value: formatCurrency(data.monthProfit, currency), sub: 'utilidad estimada', icon: TrendingUp, color: 'text-purple-600 bg-purple-50', mod: 'reports' as const },
    { label: 'Gastos Hoy', value: formatCurrency(data.expensesToday, currency), sub: 'registrados', icon: Wallet, color: 'text-rose-600 bg-rose-50', mod: 'expenses' as const },
    { label: 'Gastos Mes', value: formatCurrency(data.expensesMonth, currency), sub: 'registrados', icon: Wallet, color: 'text-red-600 bg-red-50', mod: 'expenses' as const },
    { label: 'Productos', value: String(data.totalProducts), sub: 'en catálogo', icon: Package, color: 'text-amber-600 bg-amber-50', mod: 'products' as const },
    { label: 'Clientes', value: String(data.totalCustomers), sub: 'registrados', icon: Users, color: 'text-cyan-600 bg-cyan-50', mod: 'customers' as const },
  ]

  const alerts = [
    { label: 'Sin stock', value: data.outStock, icon: PackageX, color: 'text-red-600', mod: 'products' as const },
    { label: 'Bajo stock', value: data.lowStock, icon: AlertTriangle, color: 'text-yellow-600', mod: 'products' as const },
    { label: 'Por vencer', value: data.nearExpiry, icon: CalendarClock, color: 'text-orange-600', mod: 'products' as const },
    { label: 'Vencidos', value: data.expired, icon: CalendarClock, color: 'text-gray-600', mod: 'products' as const },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <button key={i} onClick={() => setModule(c.mod)} className="text-left">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-xl font-bold mt-1 truncate">{c.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas últimos 7 días</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ventas por hora (hoy)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.salesByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}h`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} labelFormatter={(h) => `${h}:00`} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Centro de alertas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {alerts.map((a, i) => {
            const Icon = a.icon
            return (
              <button key={i} onClick={() => setModule(a.mod)} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left">
                <Icon className={`w-5 h-5 ${a.color}`} />
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">{a.value}</p>
                  <p className="text-xs text-muted-foreground">{a.label}</p>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {data.totalReceivables > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cuentas por cobrar</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalReceivables, currency)}</p>
              <p className="text-xs text-muted-foreground">{data.customersWithDebt} cliente(s) con deuda</p>
            </div>
            <button onClick={() => setModule('receivables')} className="text-blue-600 hover:underline text-sm font-medium">Ver cuentas →</button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
