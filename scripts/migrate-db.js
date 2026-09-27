const { PrismaClient } = require('@prisma/client')
const SCHEMA_COLUMNS = {
  User: [
    { name: 'id', type: 'TEXT' }, { name: 'username', type: 'TEXT' }, { name: 'passwordHash', type: 'TEXT' },
    { name: 'name', type: 'TEXT' }, { name: 'role', type: 'TEXT', default: "'vendor'" },
    { name: 'permissions', type: 'TEXT', default: "'[]'" }, { name: 'authPassword', type: 'TEXT' },
    { name: 'active', type: 'BOOLEAN', default: '1' }, { name: 'email', type: 'TEXT' }, { name: 'phone', type: 'TEXT' },
    { name: 'resetToken', type: 'TEXT' }, { name: 'resetTokenExpiry', type: 'DATETIME' },
    { name: 'emailVerified', type: 'DATETIME' }, { name: 'lastLoginAt', type: 'DATETIME' },
    { name: 'failedLoginAttempts', type: 'INTEGER', default: '0' }, { name: 'lockedUntil', type: 'DATETIME' },
    { name: 'createdAt', type: 'DATETIME' }, { name: 'updatedAt', type: 'DATETIME' },
  ],
}
async function getExistingColumns(db, table) { try { const rows = await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`); return rows.map((r) => r.name) } catch (e) { return [] } }
async function migrateDatabase() {
  const db = new PrismaClient({ log: ['error'] })
  try {
    let migrated = 0, skipped = 0
    for (const [table, columns] of Object.entries(SCHEMA_COLUMNS)) {
      const existing = await getExistingColumns(db, table)
      if (existing.length === 0) { console.log(`[migrate] Tabla "${table}" no existe — se omitirá`); continue }
      for (const col of columns) {
        if (existing.includes(col.name)) { skipped++; continue }
        let sql = `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.type}`
        if (col.default !== undefined) sql += ` DEFAULT ${col.default}`
        try { await db.$executeRawUnsafe(sql); migrated++; console.log(`[migrate] ✓ ${table}.${col.name} (${col.type}) — añadida`) }
        catch (e) { if (e.message && e.message.includes('duplicate column')) { skipped++ } else { console.error(`[migrate] ✗ Error:`, e.message); throw e } }
      }
    }
    console.log(`[migrate] Migración completada: ${migrated} columna(s) añadida(s), ${skipped} ya existían`)
    return { ok: true, migrated, skipped }
  } catch (e) { console.error('[migrate] ERROR FATAL:', e); return { ok: false, error: e.message } }
  finally { await db.$disconnect().catch(() => {}) }
}
if (require.main === module) { migrateDatabase().then((r) => process.exit(r.ok ? 0 : 1)).catch((e) => { console.error('[migrate] Excepción:', e); process.exit(1) }) }
module.exports = { migrateDatabase }
