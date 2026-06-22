import { prisma } from '@/lib/db/prisma'

/** Serve a foto do funcionário (data URI webp guardado no banco) como imagem. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const u = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } })
  if (!u?.avatarUrl) return new Response(null, { status: 404 })
  const m = u.avatarUrl.match(/^data:(.+?);base64,(.+)$/s)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    status: 200,
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' },
  })
}
