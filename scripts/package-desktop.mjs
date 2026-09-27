/**
 * Empaqueta POS Pro como app de escritorio Electron lista para Inno Setup.
 *
 * Pasos:
 *  1. next build  ->  .next/standalone + .next/static + public
 *  2. prisma generate (cliente en standalone)
 *  3. Copia el servidor standalone + seed + prisma a build-resources/server
 *  4. Empaqueta con @electron/packager -> dist/win-unpacked (o darwin/linux)
 *  5. El instalador Inno Setup usa dist/win-unpacked para generar el .exe final
 *
 * Uso:
 *   bun scripts/package-desktop.mjs --platform=win32
 *   bun scripts/package-desktop.mjs --platform=darwin
 *   bun scripts/package-desktop.mjs --platform=linux
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { packager } from '@electron/packager'

const PLATFORM = (process.argv.find((a) => a.startsWith('--platform=')) || '--platform=win32').split('=')[1]
const APP_NAME = 'POS Pro'
const APP_DIR = process.cwd()
const SERVER_SRC = path.join(APP_DIR, '.next', 'standalone')
const STATIC_SRC = path.join(APP_DIR, '.next', 'static')
const PUBLIC_SRC = path.join(APP_DIR, 'public')
const PRISMA_CLIENT = path.join(APP_DIR, 'node_modules', '@prisma')
const PRISMA_SCHEMA = path.join(APP_DIR, 'prisma', 'schema.prisma')
const SEED = path.join(APP_DIR, 'prisma', 'seed.ts')
const BUILD_TMP = path.join(APP_DIR, 'build-resources', 'server')
const OUT_DIR = path.join(APP_DIR, 'dist')

function log(msg) { console.log(`\x1b[36m[pack]\x1b[0m ${msg}`) }
function run(cmd, opts = {}) {
  log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: APP_DIR, ...opts })
}

async function main() {
  log(`Plataforma destino: ${PLATFORM}`)

  // 1. Build Next.js standalone
  log('Construyendo Next.js (standalone)...')
  run('bun run build')

  // 2. Asegurar prisma client generado
  log('Generando Prisma Client...')
  run('bun run db:generate')

  // 3. Preparar carpeta temporal del servidor
  log('Copiando servidor standalone a build-resources/server...')
  if (fs.existsSync(BUILD_TMP)) fs.rmSync(BUILD_TMP, { recursive: true, force: true })
  fs.mkdirSync(BUILD_TMP, { recursive: true })

  // El standalone ya trae node_modules mínimos + server.js
  copyRecursive(SERVER_SRC, BUILD_TMP)

  // Copiar .next/static dentro del standalone (Next lo requiere)
  const staticDest = path.join(BUILD_TMP, '.next', 'static')
  fs.mkdirSync(staticDest, { recursive: true })
  copyRecursive(STATIC_SRC, staticDest)

  // Copiar public dentro del standalone
  const publicDest = path.join(BUILD_TMP, 'public')
  if (fs.existsSync(PUBLIC_SRC)) {
    fs.mkdirSync(publicDest, { recursive: true })
    copyRecursive(PUBLIC_SRC, publicDest)
  }

  // Copiar @prisma/client al standalone (necesario en runtime).
  // Importante: el schema.prisma tiene binaryTargets = ["native", "windows"]
  // para que se incluya el binario del engine de Windows además del de Linux.
  const prismaDest = path.join(BUILD_TMP, 'node_modules', '@prisma')
  fs.mkdirSync(prismaDest, { recursive: true })
  copyRecursive(PRISMA_CLIENT, prismaDest)
  // Copiar también .prisma/client (binarios del engine + cliente generado)
  const prismaGenSrc = path.join(APP_DIR, 'node_modules', '.prisma')
  const prismaGenDest = path.join(BUILD_TMP, 'node_modules', '.prisma')
  if (fs.existsSync(prismaGenSrc)) {
    fs.mkdirSync(prismaGenDest, { recursive: true })
    copyRecursive(prismaGenSrc, prismaGenDest)
  }

  // Copiar schema de Prisma (para futuras migraciones)
  fs.mkdirSync(path.join(BUILD_TMP, 'prisma'), { recursive: true })
  fs.copyFileSync(PRISMA_SCHEMA, path.join(BUILD_TMP, 'prisma', 'schema.prisma'))

  // Crear BD plantilla con schema + datos demo (evita necesitar prisma CLI en runtime)
  log('Creando BD plantilla (template.db)...')
  const templateDbPath = path.join(APP_DIR, 'build-resources', 'template.db')
  if (fs.existsSync(templateDbPath)) fs.rmSync(templateDbPath)
  run(`DATABASE_URL="file:${templateDbPath}" bun run db:push`)
  run(`DATABASE_URL="file:${templateDbPath}" bun prisma/seed.ts`)
  fs.copyFileSync(templateDbPath, path.join(BUILD_TMP, 'template.db'))
  log(`  ✓ template.db (${(fs.statSync(path.join(BUILD_TMP, 'template.db')).size / 1024).toFixed(0)} KB)`)

  // Compilar seed.ts -> seed.js (backup para desarrollo; en runtime se usa template.db)
  log('Compilando seed...')
  try {
    run(`bun build ${SEED} --outfile ${path.join(BUILD_TMP, 'seed.js')} --target node`)
  } catch (e) {
    log('  (seed.ts ya compilado o fallback - copiando fuente)')
    fs.copyFileSync(SEED, path.join(BUILD_TMP, 'seed.ts'))
  }

  // 4. Asegurar iconos en electron/icons
  const iconDir = path.join(APP_DIR, 'electron', 'icons')
  fs.mkdirSync(iconDir, { recursive: true })
  const icoSrc = path.join(APP_DIR, 'build-resources', 'icons', 'app-icon.ico')
  if (fs.existsSync(icoSrc)) fs.copyFileSync(icoSrc, path.join(iconDir, 'app-icon.ico'))
  const png512 = path.join(APP_DIR, 'build-resources', 'icons', 'app-icon-512.png')
  if (fs.existsSync(png512)) fs.copyFileSync(png512, path.join(iconDir, 'app-icon-512.png'))

  // 5. Instalar dependencias de electron
  log('Instalando dependencias de Electron...')
  run('bun install', { cwd: path.join(APP_DIR, 'electron') })

  // 6. Empaquetar con @electron/packager
  const iconPath = PLATFORM === 'win32'
    ? path.join(APP_DIR, 'build-resources', 'icons', 'app-icon.ico')
    : PLATFORM === 'darwin'
      ? path.join(APP_DIR, 'build-resources', 'icons', 'app-icon.icns')
      : path.join(APP_DIR, 'build-resources', 'icons', 'app-icon-512.png')

  log(`Empaquetando con electron-packager (icon=${iconPath})...`)
  const appPaths = await packager({
    dir: path.join(APP_DIR, 'electron'),
    out: OUT_DIR,
    platform: PLATFORM,
    arch: 'x64',
    name: APP_NAME,
    executableName: 'POS Pro',
    icon: iconPath,
    overwrite: true,
    asar: true,
    // Excluir node_modules del asar: main.js solo usa módulos built-in de Node
    // (electron, path, fs, http, child_process) que ya provee el runtime de Electron
    ignore: [
      /node_modules/,
      /\.gitignore$/,
      /bun\.lock$/,
    ],
    extraResource: [BUILD_TMP], // -> process.resourcesPath/server
    prune: true,
    quiet: false,
  })

  log(`✓ Empaquetado completo: ${appPaths.join(', ')}`)
  log(`\nPróximo paso (Windows): compilar el instalador con Inno Setup:`)
  log(`  iscc installer\\pos-pro.iss`)
  log(`  -> genera installer\\Output\\POSPro-Setup-${require('../electron/package.json').version}.exe`)
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
