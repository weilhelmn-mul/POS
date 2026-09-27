import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  const safeName = path.basename(filename).replace(/[^\w.\-]/g, '')
  if (!safeName || safeName !== filename) return new NextResponse('Archivo inválido', { status: 422 })
  const userDataPath = process.env.POS_USER_DATA || process.cwd()
  const filepath = path.join(userDataPath, 'uploads', safeName)
  if (!fs.existsSync(filepath)) return new NextResponse('No encontrado', { status: 404 })
  const ext = path.extname(safeName).slice(1).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  try { const buffer = fs.readFileSync(filepath); return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } }) }
  catch (e) { return new NextResponse('Error', { status: 500 }) }
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  const safeName = path.basename(filename).replace(/[^\w.\-]/g, '')
  const userDataPath = process.env.POS_USER_DATA || process.cwd()
  const filepath = path.join(userDataPath, 'uploads', safeName)
  if (fs.existsSync(filepath)) { try { fs.unlinkSync(filepath) } catch (e) { console.error('[uploads] delete error:', e) } }
  return NextResponse.json({ ok: true })
}
