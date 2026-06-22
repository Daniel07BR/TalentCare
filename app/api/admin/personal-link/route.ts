import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

function parseBR(s: string | null): Date | null {
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as { stagingId?: string; nexusUserId?: string | null } | null
  const stagingId = body?.stagingId
  const nexusUserId = (body?.nexusUserId ?? '').trim() || null
  if (!stagingId) return NextResponse.json({ error: 'stagingId obrigatório' }, { status: 400 })

  const row = await prisma.personalStaging.findUnique({ where: { id: stagingId } })
  if (!row) return NextResponse.json({ error: 'registro não encontrado' }, { status: 404 })

  if (nexusUserId) {
    const birth = parseBR(row.birthRaw)
    const adm = parseBR(row.admRaw)
    const user = await prisma.user.findUnique({ where: { nexusUserId }, select: { entryDate: true } })
    await prisma.user.update({
      where: { nexusUserId },
      data: { birthDate: birth ?? undefined, gender: row.sexo ?? undefined, entryDate: user?.entryDate ? undefined : adm ?? undefined },
    })
    if (row.matchedNexusId && row.matchedNexusId !== nexusUserId) {
      await prisma.user.updateMany({ where: { nexusUserId: row.matchedNexusId }, data: { birthDate: null } })
    }
    await prisma.personalStaging.update({ where: { id: stagingId }, data: { matchedNexusId: nexusUserId, status: 'applied' } })
  } else {
    if (row.matchedNexusId) await prisma.user.updateMany({ where: { nexusUserId: row.matchedNexusId }, data: { birthDate: null } })
    await prisma.personalStaging.update({ where: { id: stagingId }, data: { matchedNexusId: null, status: 'rejected' } })
  }
  return NextResponse.json({ ok: true })
}
