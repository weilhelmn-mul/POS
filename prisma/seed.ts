import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { generateEan13, generateInternalCode } from '../src/lib/settings'
import { DEFAULT_BUSINESS } from '../src/lib/settings'

async function main() {
  console.log('🌱 Seeding database...')

  // Users
  const admin = await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      name: 'Administrador',
      role: 'admin',
      authPassword: hashPassword('admin'),
      email: 'admin@minegocio.com',
    },
  })

  const vendor = await db.user.upsert({
    where: { username: 'vendedor' },
    update: {},
    create: {
      username: 'vendedor',
      passwordHash: hashPassword('vendedor123'),
      name: 'Vendedor Demo',
      role: 'vendor',
      permissions: JSON.stringify([
        'products.view', 'sales.create', 'sales.view', 'sales.reprint',
        'customers.create', 'customers.edit', 'receivables.view', 'reports.view',
      ]),
    },
  })

  // Categorías
  const catOficina = await db.category.create({ data: { name: 'Oficina' } })
  const catLapiceros = await db.category.create({ data: { name: 'Lapiceros', parentId: catOficina.id } })
  const catCuadernos = await db.category.create({ data: { name: 'Cuadernos', parentId: catOficina.id } })
  const catBorradores = await db.category.create({ data: { name: 'Borradores', parentId: catOficina.id } })
  const catReglas = await db.category.create({ data: { name: 'Reglas', parentId: catOficina.id } })
  const catBebidas = await db.category.create({ data: { name: 'Bebidas' } })
  const catSnacks = await db.category.create({ data: { name: 'Snacks' } })
  const catLimpieza = await db.category.create({ data: { name: 'Limpieza' } })

  // Marcas
  const faberCastell = await db.brand.create({ data: { name: 'Faber-Castell' } })
  const pilot = await db.brand.create({ data: { name: 'Pilot' } })
  const oso = await db.brand.create({ data: { name: 'Osito' } })
  const coca = await db.brand.create({ data: { name: 'Coca-Cola' } })
  const lays = await db.brand.create({ data: { name: 'Lays' } })

  // Proveedores
  const supDistribuidora = await db.supplier.create({ data: { name: 'Distribuidora Andina SAC', document: '20512345678', phone: '01 234 5678', contact: 'Carlos Ruiz' } })
  const supMayorista = await db.supplier.create({ data: { name: 'Mayorista Central EIRL', document: '20487654321', phone: '01 876 5432', contact: 'Ana Torres' } })

  // Productos
  const now = new Date()
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  const products = [
    { name: 'Cuaderno A4 100 hojas', cat: catCuadernos.id, brand: oso.id, sup: supDistribuidora.id, purchase: 3.5, sale: 6.0, wholesale: 5.0, stock: 80, min: 10, unit: 'unidad', warehouse: 'Almacén A', aisle: 'Pasillo 1', shelf: 'Estante 2', level: 'Nivel 1', expiry: inDays(180), lot: 'L-2024-001' },
    { name: 'Lapicero Azul', cat: catLapiceros.id, brand: faberCastell.id, sup: supDistribuidora.id, purchase: 0.8, sale: 1.5, wholesale: 1.2, stock: 5, min: 20, unit: 'unidad', warehouse: 'Almacén A', aisle: 'Pasillo 1', shelf: 'Estante 1', level: 'Nivel 2' },
    { name: 'Lapicero Negro', cat: catLapiceros.id, brand: pilot.id, sup: supDistribuidora.id, purchase: 0.9, sale: 1.6, wholesale: 1.3, stock: 50, min: 20, unit: 'unidad', warehouse: 'Almacén A', aisle: 'Pasillo 1', shelf: 'Estante 1', level: 'Nivel 1' },
    { name: 'Borrador Blanco', cat: catBorradores.id, brand: faberCastell.id, sup: supMayorista.id, purchase: 0.5, sale: 1.0, wholesale: 0.8, stock: 40, min: 10, unit: 'unidad', warehouse: 'Almacén A', aisle: 'Pasillo 2', shelf: 'Estante 3', level: 'Nivel 1' },
    { name: 'Regla 30cm', cat: catReglas.id, brand: faberCastell.id, sup: supMayorista.id, purchase: 1.2, sale: 2.5, wholesale: 2.0, stock: 25, min: 5, unit: 'unidad', warehouse: 'Almacén B', aisle: 'Pasillo 1', shelf: 'Estante 1', level: 'Nivel 2' },
    { name: 'Coca Cola 500ml', cat: catBebidas.id, brand: coca.id, sup: supDistribuidora.id, purchase: 1.8, sale: 3.5, wholesale: 3.0, stock: 120, min: 24, unit: 'unidad', warehouse: 'Almacén C', aisle: 'Pasillo 1', shelf: 'Estante 1', level: 'Nivel 1', expiry: inDays(120), lot: 'CC-2024-02' },
    { name: 'Inka Kola 500ml', cat: catBebidas.id, brand: oso.id, sup: supDistribuidora.id, purchase: 1.8, sale: 3.5, wholesale: 3.0, stock: 8, min: 24, unit: 'unidad', warehouse: 'Almacén C', aisle: 'Pasillo 1', shelf: 'Estante 2', level: 'Nivel 1', expiry: inDays(10), lot: 'IK-2024-03' },
    { name: 'Papas Lays Clásicas', cat: catSnacks.id, brand: lays.id, sup: supMayorista.id, purchase: 2.5, sale: 4.5, wholesale: 3.8, stock: 60, min: 12, unit: 'unidad', warehouse: 'Almacén C', aisle: 'Pasillo 2', shelf: 'Estante 1', level: 'Nivel 2', expiry: inDays(60), lot: 'LY-2024-05' },
    { name: 'Detergente Bolso 1kg', cat: catLimpieza.id, brand: oso.id, sup: supMayorista.id, purchase: 4.0, sale: 7.5, wholesale: 6.5, stock: 0, min: 10, unit: 'unidad', warehouse: 'Almacén B', aisle: 'Pasillo 2', shelf: 'Estante 3', level: 'Nivel 1' },
    { name: 'Leche Gloria 1L', cat: catBebidas.id, brand: oso.id, sup: supDistribuidora.id, purchase: 3.8, sale: 6.0, wholesale: 5.4, stock: 30, min: 12, unit: 'unidad', warehouse: 'Almacén C', aisle: 'Pasillo 1', shelf: 'Estante 3', level: 'Nivel 1', expiry: inDays(3), lot: 'GL-2024-08' },
    { name: 'Galleta Soda 6 pack', cat: catSnacks.id, brand: oso.id, sup: supMayorista.id, purchase: 2.0, sale: 3.8, wholesale: 3.2, stock: 45, min: 12, unit: 'pack', warehouse: 'Almacén C', aisle: 'Pasillo 2', shelf: 'Estante 2', level: 'Nivel 1', expiry: inDays(90), lot: 'SD-2024-09' },
    { name: 'Cuaderno Espiral 80h', cat: catCuadernos.id, brand: oso.id, sup: supMayorista.id, purchase: 2.8, sale: 5.0, wholesale: 4.2, stock: 35, min: 10, unit: 'unidad', warehouse: 'Almacén A', aisle: 'Pasillo 1', shelf: 'Estante 3', level: 'Nivel 2' },
  ]

  let seq = 1
  const createdProducts: Awaited<ReturnType<typeof db.product.create>>[] = []
  for (const p of products) {
    const prod = await db.product.create({
      data: {
        name: p.name,
        internalCode: generateInternalCode(seq++),
        barcode: generateEan13('20'),
        categoryId: p.cat,
        brandId: p.brand,
        supplierId: p.sup,
        purchasePrice: p.purchase,
        salePrice: p.sale,
        wholesalePrice: p.wholesale,
        stock: p.stock,
        minStock: p.min,
        unit: p.unit,
        locationWarehouse: p.warehouse,
        locationAisle: p.aisle,
        locationShelf: p.shelf,
        locationLevel: p.level,
        expiryDate: p.expiry ?? null,
        lot: p.lot ?? null,
        isFavorite: seq <= 4,
      },
    })
    createdProducts.push(prod)
  }

  // Combo Escolar: 1 cuaderno + 2 lapiceros + 1 borrador + 1 regla
  const cuaderno = createdProducts[0]
  const lapAzul = createdProducts[1]
  const borrador = createdProducts[3]
  const regla = createdProducts[4]
  const bundleProduct = await db.product.create({
    data: {
      name: 'Combo Escolar',
      internalCode: generateInternalCode(seq++),
      barcode: generateEan13('20'),
      purchasePrice: 5.8,
      salePrice: 12.0,
      wholesalePrice: 10.0,
      stock: 0,
      minStock: 0,
      unit: 'combo',
      isBundle: true,
    },
  })
  const bundle = await db.bundle.create({
    data: {
      productId: bundleProduct.id,
      price: 12.0,
      items: {
        create: [
          { productId: cuaderno.id, quantity: 1 },
          { productId: lapAzul.id, quantity: 2 },
          { productId: borrador.id, quantity: 1 },
          { productId: regla.id, quantity: 1 },
        ],
      },
    },
  })

  // Clientes
  await db.customer.createMany({
    data: [
      { name: 'María García', document: '45678912', phone: '987 654 321', address: 'Jr. Los Olivos 123', creditLimit: 500, creditBalance: 0 },
      { name: 'Ferretería El Tornillo', document: '20555666777', phone: '01 555 6666', address: 'Av. Industrial 456', creditLimit: 2000, creditBalance: 350 },
      { name: 'Carlos Mendoza', document: '70123456', phone: '966 555 444', address: 'Calle Las Flores 789', creditLimit: 300, creditBalance: 0 },
    ],
  })

  // Settings del negocio
  await db.setting.upsert({
    where: { key: 'business' },
    update: {},
    create: { key: 'business', value: JSON.stringify(DEFAULT_BUSINESS) },
  })

  console.log('✅ Seed completado')
  console.log(`   Admin: admin / admin123  (auth: admin)`)
  console.log(`   Vendor: vendedor / vendedor123`)
  console.log(`   Productos: ${createdProducts.length + 1} (incl. combo)`)
  console.log(`   Bundle: ${bundle.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
