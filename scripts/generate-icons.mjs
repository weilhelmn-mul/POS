/**
 * Genera iconos multi-resolución para Windows (.ico) y PNG redimensionados
 * a partir de un PNG fuente de 1024x1024.
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import png2icons from 'png2icons'

const SRC = path.join(process.cwd(), 'build-resources', 'icons', 'app-icon-1024.png')
const OUT = path.join(process.cwd(), 'build-resources', 'icons')

async function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`Falta la fuente: ${SRC}`)
  }
  console.log('Generando iconos desde', SRC)

  // PNG redimensionados (para PWA / favicon / linux)
  const sizes = [16, 32, 48, 64, 128, 256, 512]
  for (const s of sizes) {
    const out = path.join(OUT, `app-icon-${s}.png`)
    await sharp(SRC).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(out)
    console.log(`  ✓ PNG ${s}x${s}`)
  }

  // ICO multi-resolución para Windows (Inno Setup usa este)
  const buf256 = fs.readFileSync(path.join(OUT, 'app-icon-256.png'))
  // createICO(interp, allsizes) genera un ICO con todas las resoluciones
  const ico = png2icons.createICO(buf256, png2icons.BILINEAR, 0, false)
  fs.writeFileSync(path.join(OUT, 'app-icon.ico'), ico)
  console.log('  ✓ ICO multi-resolución (16..256)')

  // ICNS para macOS (bonus)
  const png512 = fs.readFileSync(path.join(OUT, 'app-icon-512.png'))
  const icns = png2icons.createICNS(png512, png2icons.BILINEAR, 0)
  if (icns) {
    fs.writeFileSync(path.join(OUT, 'app-icon.icns'), icns)
    console.log('  ✓ ICNS macOS')
  }

  // Copiar favicon a /public
  const pubDir = path.join(process.cwd(), 'public')
  await sharp(SRC).resize(32, 32, { fit: 'contain' }).png().toFile(path.join(pubDir, 'favicon-32.png'))
  await sharp(SRC).resize(192, 192, { fit: 'contain' }).png().toFile(path.join(pubDir, 'icon-192.png'))
  await sharp(SRC).resize(512, 512, { fit: 'contain' }).png().toFile(path.join(pubDir, 'icon-512.png'))
  await sharp(SRC).resize(180, 180, { fit: 'contain' }).png().toFile(path.join(pubDir, 'apple-touch-icon.png'))
  console.log('  ✓ Iconos PWA copiados a /public')
}

main().catch((e) => { console.error(e); process.exit(1) })
