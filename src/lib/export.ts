import { db } from '@/lib/db'
async function loadXLSX() { const XLSX = await import('xlsx'); return XLSX }
type ExportFormat = 'xlsx' | 'csv' | 'json'
interface ExportOptions { format: ExportFormat; resource: string }
const RESOURCE_BUILDERS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  products: async () => { const rows = await db.product.findMany({ include: { category: true, brand: true, supplier: true }, orderBy: { name: 'asc' } }); return rows.map((p) => ({ Codigo: p.internalCode, Nombre: p.name, CodigoBarras: p.barcode || '', Categoria: p.category?.name || '', Marca: p.brand?.name || '', Proveedor: p.supplier?.name || '', PrecioCompra: p.purchasePrice, PrecioVenta: p.salePrice, Stock: p.stock, Unidad: p.unit })) },
  customers: async () => { const rows = await db.customer.findMany({ orderBy: { name: 'asc' } }); return rows.map((c) => ({ Nombre: c.name, Documento: c.document || '', Telefono: c.phone || '', Email: c.email || '', Direccion: c.address || '', LimiteCredito: c.creditLimit, SaldoPendiente: c.creditBalance })) },
  sales: async () => { const rows = await db.sale.findMany({ include: { customer: true, user: true, items: true }, orderBy: { createdAt: 'desc' } }); return rows.map((s) => ({ Factura: s.invoiceNumber, Fecha: s.createdAt.toISOString(), Cliente: s.customer?.name || 'Consumidor', Vendedor: s.user?.name || '', Subtotal: s.subtotal, Descuento: s.discount, Impuesto: s.tax, Total: s.total, Pagado: s.paidAmount, Saldo: s.creditBalance, MetodoPago: s.paymentMethod, Estado: s.status, Items: s.items.length })) },
  purchases: async () => { const rows = await db.purchase.findMany({ include: { supplier: true, user: true }, orderBy: { createdAt: 'desc' } }); return rows.map((p) => ({ Documento: p.documentNo || '', Proveedor: p.supplier?.name || '', Fecha: p.createdAt.toISOString(), Total: p.total, RegistradoPor: p.user?.name || '' })) },
  expenses: async () => { const rows = await db.expense.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }); return rows.map((e) => ({ Categoria: e.category, Descripcion: e.description, Monto: e.amount, Fecha: e.createdAt.toISOString(), RegistradoPor: e.user?.name || '' })) },
  inventory: async () => { const rows = await db.product.findMany({ orderBy: { name: 'asc' } }); return rows.map((p) => ({ Codigo: p.internalCode, Nombre: p.name, Stock: p.stock, PrecioCompra: p.purchasePrice, Valorizado: p.stock * p.purchasePrice })) },
  users: async () => { const rows = await db.user.findMany(); return rows.map((u) => ({ Usuario: u.username, Nombre: u.name, Rol: u.role, Activo: u.active, Creado: u.createdAt.toISOString() })) },
}
export async function exportData(opts: ExportOptions): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  const builder = RESOURCE_BUILDERS[opts.resource]
  if (!builder) throw new Error(`Recurso no soportado: ${opts.resource}`)
  const data = await builder()
  const ts = new Date().toISOString().slice(0, 10)
  if (opts.format === 'json') { return { buffer: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'), filename: `${opts.resource}_${ts}.json`, mime: 'application/json' } }
  const XLSX = await loadXLSX()
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  if (opts.format === 'csv') { const csv = XLSX.utils.sheet_to_csv(ws); return { buffer: Buffer.from('\ufeff' + csv, 'utf-8'), filename: `${opts.resource}_${ts}.csv`, mime: 'text/csv' } }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return { buffer: Buffer.from(buf), filename: `${opts.resource}_${ts}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
}
