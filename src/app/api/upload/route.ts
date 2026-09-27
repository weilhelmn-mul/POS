import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 422 })
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 422 })
    const userDataPath = process.env.POS_USER_DATA || process.cwd()
    const uploadsDir = path.join(userDataPath, 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const safeExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
    const filepath = path.join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(bytes))
    return NextResponse.json({ url: `/api/uploads/${filename}` })
  } catch (e) { console.error('[upload] error:', e); return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 }) }
}
